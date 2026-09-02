output "ecr_repository_url" {
  value = aws_ecr_repository.this.repository_url
}

output "ecr_repository_arn" {
  value = aws_ecr_repository.this.arn
}

output "ecs_service_name" {
  value = aws_ecs_service.this.name
}

output "secret_arn" {
  value = local.has_secrets ? aws_secretsmanager_secret.this[0].arn : null
}
