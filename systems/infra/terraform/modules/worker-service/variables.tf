variable "name" {
  description = "System name, e.g. \"people-enrichment\". Used to derive every resource name."
  type        = string
}

variable "cluster_id" {
  type = string
}

variable "cluster_name" {
  description = "Needed (in addition to cluster_id) because Application Auto Scaling addresses ECS services by cluster name, not ARN"
  type        = string
}

variable "aws_region" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_id" {
  type = string
}

variable "cpu" {
  description = "Fargate task vCPU units (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate task memory in MB"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Starting task count at creation only — Application Auto Scaling owns it after that (see ignore_changes on aws_ecs_service)."
  type        = number
  default     = 1
}

variable "min_capacity" {
  description = "Floor for Application Auto Scaling. 0 = true scale-to-zero when idle."
  type        = number
  default     = 0
}

variable "max_capacity" {
  description = "Ceiling for Application Auto Scaling."
  type        = number
  default     = 1
}

variable "queue_visibility_timeout_seconds" {
  description = "How long a received wake message stays invisible before SQS assumes the receiver died and redelivers it. Must comfortably exceed the worst-case time to drain a full backlog of jobs, since the worker holds the message for that whole span (see systems/shared/queue.py) rather than deleting it on receipt."
  type        = number
  default     = 1800 # 30 minutes
}

variable "environment" {
  description = "Plain (non-secret) env vars for the container"
  type        = map(string)
  default     = {}
}

variable "secret_keys" {
  description = "Names of secret env vars. A Secrets Manager JSON secret is created with placeholder values under these keys — fill in the real values after apply."
  type        = list(string)
  default     = []
}
