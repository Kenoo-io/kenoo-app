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
