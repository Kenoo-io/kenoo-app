// One system = one instantiation of this module. It creates everything that
// system needs to run as a scale-from-zero Fargate service: an ECR repo to
// push images to, a Secrets Manager entry for its API keys, a log group, the
// IAM roles, the task definition, and the ECS service itself.

locals {
  has_secrets = length(var.secret_keys) > 0
}

resource "aws_ecr_repository" "this" {
  name                 = "kenoo-${var.name}"
  image_tag_mutability = "MUTABLE"
  force_delete         = false
}

resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Expire untagged images after 14 days"
      selection = {
        tagStatus   = "untagged"
        countType   = "sinceImagePushed"
        countUnit   = "days"
        countNumber = 14
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/kenoo/${var.name}"
  retention_in_days = 30
}

// The "wake queue": not a job payload queue — systems_jobs in Supabase stays
// the source of truth for actual work. A message here means only "something
// might be pending, don't scale to zero." Application Auto Scaling watches
// this queue's depth (visible + in-flight) to drive desired_count 0<->1; see
// systems/shared/queue.py for why the worker holds the message open for the
// whole time it might be draining a backlog, instead of deleting on receipt.
resource "aws_sqs_queue" "wake" {
  name                       = "kenoo-${var.name}-wake"
  visibility_timeout_seconds = var.queue_visibility_timeout_seconds
  message_retention_seconds  = 3600
}

// Secret values are placeholders on purpose — Terraform provisions the
// container for the secret, a human fills it in via the console or:
//   aws secretsmanager put-secret-value --secret-id kenoo/<name>/env --secret-string '{...}'
resource "aws_secretsmanager_secret" "this" {
  count = local.has_secrets ? 1 : 0
  name  = "kenoo/${var.name}/env"
}

resource "aws_secretsmanager_secret_version" "this" {
  count     = local.has_secrets ? 1 : 0
  secret_id = aws_secretsmanager_secret.this[0].id
  secret_string = jsonencode({
    for key in var.secret_keys : key => "REPLACE_ME"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

data "aws_iam_policy_document" "execution_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "kenoo-${var.name}-execution"
  assume_role_policy = data.aws_iam_policy_document.execution_assume_role.json
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  count = local.has_secrets ? 1 : 0
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.this[0].arn]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  count  = local.has_secrets ? 1 : 0
  name   = "read-own-secret"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets[0].json
}

// Task role (distinct from the execution role above): this is what the
// running container itself assumes to call AWS APIs — here, just enough to
// read and clear its own wake queue.
resource "aws_iam_role" "task" {
  name               = "kenoo-${var.name}-task"
  assume_role_policy = data.aws_iam_policy_document.execution_assume_role.json
}

data "aws_iam_policy_document" "task_queue" {
  statement {
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
    resources = [aws_sqs_queue.wake.arn]
  }
}

resource "aws_iam_role_policy" "task_queue" {
  name   = "wake-queue"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.task_queue.json
}

resource "aws_ecs_task_definition" "this" {
  family                   = "kenoo-${var.name}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = var.name
      image     = "${aws_ecr_repository.this.repository_url}:latest"
      essential = true

      environment = concat(
        [for k, v in var.environment : { name = k, value = v }],
        [{ name = "SQS_QUEUE_URL", value = aws_sqs_queue.wake.url }]
      )

      secrets = local.has_secrets ? [
        for key in var.secret_keys : {
          name      = key
          valueFrom = "${aws_secretsmanager_secret.this[0].arn}:${key}::"
        }
      ] : []

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = var.name
        }
      }
    }
  ])
}

resource "aws_ecs_service" "this" {
  name            = var.name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = true // no NAT gateway; workers only need outbound internet
  }

  lifecycle {
    ignore_changes = [desired_count] # owned by Application Auto Scaling below
  }
}

resource "aws_appautoscaling_target" "this" {
  service_namespace  = "ecs"
  resource_id        = "service/${var.cluster_name}/${aws_ecs_service.this.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.min_capacity
  max_capacity       = var.max_capacity
}

// Target-tracking on (visible + in-flight) wake-queue messages, not just
// visible ones. That combination is what stops this from scaling to zero
// while a job is still running: the worker holds its message open (received,
// not deleted -> "in-flight") for as long as it might still have backlog to
// drain, so the backlog metric only reads zero once it's genuinely idle.
resource "aws_appautoscaling_policy" "queue_depth" {
  name               = "kenoo-${var.name}-queue-depth"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.this.service_namespace
  resource_id        = aws_appautoscaling_target.this.resource_id
  scalable_dimension = aws_appautoscaling_target.this.scalable_dimension

  target_tracking_scaling_policy_configuration {
    // AWS turns this into a strict-greater-than alarm threshold, not >=. A
    // single queued job produces backlog=1 — target_value=1 would need
    // backlog>1 (i.e. 2+ simultaneous jobs) to ever scale out, so a single
    // job would never wake the service. 0.5 makes any backlog >=1 breach it.
    target_value       = 0.5
    scale_in_cooldown  = 300
    scale_out_cooldown = 0

    customized_metric_specification {
      metrics {
        id          = "visible"
        return_data = false
        metric_stat {
          metric {
            namespace   = "AWS/SQS"
            metric_name = "ApproximateNumberOfMessagesVisible"
            dimensions {
              name  = "QueueName"
              value = aws_sqs_queue.wake.name
            }
          }
          stat = "Maximum"
        }
      }
      metrics {
        id          = "in_flight"
        return_data = false
        metric_stat {
          metric {
            namespace   = "AWS/SQS"
            metric_name = "ApproximateNumberOfMessagesNotVisible"
            dimensions {
              name  = "QueueName"
              value = aws_sqs_queue.wake.name
            }
          }
          stat = "Maximum"
        }
      }
      metrics {
        id          = "backlog"
        expression  = "visible + in_flight"
        return_data = true
      }
    }
  }
}
