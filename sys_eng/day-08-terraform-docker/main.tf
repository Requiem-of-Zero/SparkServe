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
  filename = "${path.module}/hosts/inventory.yml"

  file_permission      = "0644"
  directory_permission = "0755"

  content = templatefile("${path.module}/templates/inventory.yml.tftpl", {
    monitor_name      = var.monitor_name
    monitor_host      = var.monitor_host
    monitor_domain    = var.monitor_domain
    restaurant_name   = var.restaurant_name
    restaurant_host   = var.restaurant_host
    restaurant_domain = var.restaurant_domain
  })
}

resource "local_file" "hosts_file" {
  filename = "${path.module}/hosts/hosts"

  file_permission      = "0644"
  directory_permission = "0755"

  content = templatefile("${path.module}/templates/hosts.tftpl", {
    monitor_host      = var.monitor_host
    monitor_domain    = var.monitor_domain
    restaurant_host   = var.restaurant_host
    restaurant_domain = var.restaurant_domain
  })
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
