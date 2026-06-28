terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

output "restaurant_summary" {
  value = {
    name   = var.restaurant_name
    domain = var.restaurant_domain
    host   = var.restaurant_host
  }
}
