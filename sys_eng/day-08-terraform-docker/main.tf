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
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
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

# Resource that checks if there is a docker-compose already existing, if not; it will copy the template compose for the restaurant
resource "null_resource" "push_restaurant_compose" {
  for_each = var.restaurants

  triggers = {
    compose_sha = local_file.restaurant_compose[each.key].content_sha256
  }

  connection {
    type        = "ssh"
    host        = each.value.host
    user        = each.value.ssh_user
    private_key = file(pathexpand(var.ssh_private_key_path))
  }

  provisioner "remote-exec" {
    inline = [
      "mkdir -p ${each.value.deploy_base_path}/${each.key}"
    ]
  }

  provisioner "file" {
    source      = local_file.restaurant_compose[each.key].filename
    destination = "${each.value.deploy_base_path}/${each.key}/docker-compose.yml"
  }

  provisioner "remote-exec" {
    inline = [
      "cd ${each.value.deploy_base_path}/${each.key}",
      "docker compose config"
    ]
  }
}

output "platform_summary" {
  value = {
    monitors    = var.monitors
    restaurants = var.restaurants
  }
}
