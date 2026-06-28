terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

provider "docker" {}

resource "local_file" "host_inventory" {
  filename = "${path.module}/hosts/inventory.txt"

  content = <<EOT
Monitor:
  Name: ${var.monitor_name}
  Role: monitoring
  Host: ${var.monitor_host}
  Domain: ${var.monitor_domain}

Restaurant:
  Name: ${var.restaurant_name}
  Role: restaurant-pos
  Host: ${var.restaurant_host}
  Domain: ${var.restaurant_domain}
EOT
}

output "platform_summary" {
  value = {
    monitor = {
      role   = "monitoring"
      name   = var.monitor_name
      domain = var.monitor_domain
      host   = var.monitor_host
    }

    restaurant = {
      role   = "restaurant-pos"
      name   = var.restaurant_name
      domain = var.restaurant_domain
      host   = var.restaurant_host
    }
  }
}
