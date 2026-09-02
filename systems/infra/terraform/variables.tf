variable "aws_region" {
  description = "AWS region for all Kenoo systems infra"
  type        = string
  default     = "us-east-2"
}

variable "github_repo" {
  description = "GitHub repo allowed to assume the CI deploy role, as owner/repo"
  type        = string
  default     = "Kenoo-io/kenoo-app"
}
