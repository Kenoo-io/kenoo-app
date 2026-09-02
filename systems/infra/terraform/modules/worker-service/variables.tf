variable "name" {
  description = "System name, e.g. \"people-enrichment\". Used to derive every resource name."
  type        = string
}

variable "cluster_id" {
  type = string
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
  description = "How many copies of this worker run at once. 0 pauses it without destroying infra."
  type        = number
  default     = 1
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
