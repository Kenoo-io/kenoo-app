// Shared networking + cluster for every Kenoo system. Uses the default VPC's
// public subnets with assign_public_ip = true instead of a NAT gateway —
// these are outbound-only workers, so there's nothing a NAT buys us at
// ~$32/mo for one, times however many we'd otherwise need.

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "workers" {
  name        = "kenoo-systems-workers"
  description = "Kenoo background workers (ECS Fargate) - outbound only, no inbound needed"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_ecs_cluster" "kenoo" {
  name = "kenoo-systems"
}

// ---------------------------------------------------------------------------
// GitHub Actions CI deploy role (OIDC — no long-lived AWS keys in GitHub)
// ---------------------------------------------------------------------------

data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}

data "aws_iam_policy_document" "github_actions_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "github_actions_deploy" {
  name               = "kenoo-github-actions-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json
}

data "aws_iam_policy_document" "github_actions_deploy" {
  statement {
    sid       = "ECRAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid = "ECRPushPull"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
    ]
    resources = [for s in module.worker : s.ecr_repository_arn]
  }
  statement {
    sid       = "ECSDeploy"
    actions   = ["ecs:UpdateService", "ecs:DescribeServices"]
    resources = [for s in module.worker : "arn:aws:ecs:${var.aws_region}:*:service/${aws_ecs_cluster.kenoo.name}/${s.ecs_service_name}"]
  }
}

resource "aws_iam_role_policy" "github_actions_deploy" {
  name   = "deploy"
  role   = aws_iam_role.github_actions_deploy.id
  policy = data.aws_iam_policy_document.github_actions_deploy.json
}

// ---------------------------------------------------------------------------
// The platform app (apps/platform, on Vercel) needs to send one SQS message
// per job it enqueues, to wake up a scaled-to-zero worker. Deliberately a
// separate IAM identity from the SES-sending credential already used
// elsewhere — reusing that one for a second, unrelated purpose is exactly
// the kind of mix-up that cost real debugging time earlier on this project.
// Scoped to sqs:SendMessage on these queues, nothing else.
// ---------------------------------------------------------------------------

resource "aws_iam_user" "platform_queue_publisher" {
  name = "kenoo-platform-queue-publisher"
}

data "aws_iam_policy_document" "platform_queue_publisher" {
  statement {
    actions   = ["sqs:SendMessage"]
    resources = [for s in module.worker : s.queue_arn]
  }
}

resource "aws_iam_user_policy" "platform_queue_publisher" {
  name   = "send-wake-messages"
  user   = aws_iam_user.platform_queue_publisher.name
  policy = data.aws_iam_policy_document.platform_queue_publisher.json
}

// ---------------------------------------------------------------------------
// Systems — add a new one here, `terraform apply`, done.
// ---------------------------------------------------------------------------

locals {
  systems = {
    people-enrichment = {
      cpu           = 256
      memory        = 512
      desired_count = 1
      environment = {
        SUPABASE_URL          = "https://oehqusxpbwtbeenzixjh.supabase.co"
        POLL_INTERVAL_SECONDS = "10"
      }
      secret_keys = [
        "SUPABASE_SERVICE_ROLE_KEY",
        "SERPER_API_KEY",
        "OPENAI_API_KEY",
      ]
    }
  }
}

module "worker" {
  source   = "./modules/worker-service"
  for_each = local.systems

  name              = each.key
  cluster_id        = aws_ecs_cluster.kenoo.id
  cluster_name      = aws_ecs_cluster.kenoo.name
  aws_region        = var.aws_region
  subnet_ids        = data.aws_subnets.default.ids
  security_group_id = aws_security_group.workers.id
  cpu               = each.value.cpu
  memory            = each.value.memory
  desired_count     = each.value.desired_count
  environment       = each.value.environment
  secret_keys       = each.value.secret_keys
}
