terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "kenoo-terraform-state-122445003394"
    key            = "systems/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "kenoo-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}
