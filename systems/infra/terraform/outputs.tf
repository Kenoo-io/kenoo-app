output "ecs_cluster_name" {
  value = aws_ecs_cluster.kenoo.name
}

output "github_actions_role_arn" {
  description = "Put this in the GitHub Actions workflow / repo variable (not a secret — it's a role ARN, only assumable by this repo's `main` branch via OIDC)"
  value       = aws_iam_role.github_actions_deploy.arn
}

output "ecr_repository_urls" {
  value = { for name, s in module.worker : name => s.ecr_repository_url }
}

output "secret_arns" {
  description = "Fill these in with real values: aws secretsmanager put-secret-value --secret-id <name> --secret-string '{...}'"
  value       = { for name, s in module.worker : name => s.secret_arn }
}

output "queue_urls" {
  description = "Put the relevant one in the platform app's <SYSTEM>_SQS_QUEUE_URL env var"
  value       = { for name, s in module.worker : name => s.queue_url }
}

output "platform_queue_publisher_user" {
  description = "Create an access key for this IAM user (console: IAM -> Users -> this user -> Security credentials) and put it in apps/platform's Vercel env as SYSTEMS_QUEUE_AWS_ACCESS_KEY_ID / SYSTEMS_QUEUE_AWS_SECRET_ACCESS_KEY"
  value       = aws_iam_user.platform_queue_publisher.name
}
