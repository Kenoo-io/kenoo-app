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

resource "aws_ecs_task_definition" "this" {
  family                   = "kenoo-${var.name}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn

  container_definitions = jsonencode([
    {
      name      = var.name
      image     = "${aws_ecr_repository.this.repository_url}:latest"
      essential = true

      environment = [
        for k, v in var.environment : { name = k, value = v }
      ]

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
}
