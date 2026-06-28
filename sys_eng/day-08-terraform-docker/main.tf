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
    monitors    = var.monitors
    restaurants = var.restaurants
  })
}

resource "local_file" "hosts_file" {
  filename = "${path.module}/hosts/hosts"

  file_permission      = "0644"
  directory_permission = "0755"

  content = templatefile("${path.module}/templates/hosts.tftpl", {
    monitors    = var.monitors
    restaurants = var.restaurants
  })
}

resource "local_file" "restaurant_compose" {
  for_each = var.restaurants

  filename = "${path.module}/generated/restaurants/${each.key}/docker-compose.yml"

  file_permission      = "0644"
  directory_permission = "0755"

  content = templatefile("${path.module}/templates/restaurant-compose.yml.tftpl", {
    restaurant_key = each.key
    restaurant     = each.value
  })
}

output "platform_summary" {
  value = {
    monitors    = var.monitors
    restaurants = var.restaurants
  }
}
