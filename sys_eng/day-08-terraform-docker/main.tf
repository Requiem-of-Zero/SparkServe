terraform {
  # Provider plugins used by this Terraform stack.
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

# Generates a YAML inventory of monitors, restaurants, services, and deploy metadata.
resource "local_file" "host_inventory" {
  filename = "${path.module}/hosts/inventory.yml"

  file_permission      = "0644"
  directory_permission = "0755"

  content = templatefile("${path.module}/templates/inventory.yml.tftpl", {
    monitors    = var.monitors
    restaurants = var.restaurants
  })
}

# Generates a Linux hosts-file style mapping for local DNS testing.
resource "local_file" "hosts_file" {
  filename = "${path.module}/hosts/hosts"

  file_permission      = "0644"
  directory_permission = "0755"

  content = templatefile("${path.module}/templates/hosts.tftpl", {
    monitors    = var.monitors
    restaurants = var.restaurants
  })
}

# Generates one Docker Compose file per restaurant.
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

# Generates one POS app environment file per restaurant.
resource "local_file" "restaurant_env" {
  for_each = var.restaurants

  filename = "${path.module}/generated/restaurants/${each.key}/pos-app.env"

  file_permission      = "0600"
  directory_permission = "0755"

  content = templatefile("${path.module}/templates/restaurant-env.tftpl", {
    restaurant = each.value
  })
}

# Generates one NGINX reverse-proxy config per restaurant.
resource "local_file" "restaurant_nginx" {
  for_each = var.restaurants

  filename = "${path.module}/generated/restaurants/${each.key}/nginx/default.conf"

  file_permission      = "0644"
  directory_permission = "0755"

  content = templatefile("${path.module}/templates/restaurant-nginx.conf.tftpl", {
    restaurant = each.value
  })
}

# Pushes each generated restaurant bundle to its Ubuntu host over SSH.
resource "null_resource" "push_restaurant_compose" {
  for_each = var.restaurants

  triggers = {
    compose_sha = local_file.restaurant_compose[each.key].content_sha256
    env_sha     = local_file.restaurant_env[each.key].content_sha256
    nginx_sha   = local_file.restaurant_nginx[each.key].content_sha256
  }

  connection {
    type        = "ssh"
    host        = each.value.host
    user        = each.value.ssh_user
    private_key = file(pathexpand(var.ssh_private_key_path))
  }

  provisioner "remote-exec" {
    inline = [
      "mkdir -p ${each.value.deploy_base_path}/${each.key}/pos-app ${each.value.deploy_base_path}/${each.key}/nginx"
    ]
  }

  provisioner "file" {
    source      = local_file.restaurant_compose[each.key].filename
    destination = "${each.value.deploy_base_path}/${each.key}/docker-compose.yml"
  }

  provisioner "file" {
    source      = "${path.module}/../docker-nextjs-pos/pos-app"
    destination = "${each.value.deploy_base_path}/${each.key}"
  }

  provisioner "file" {
    source      = local_file.restaurant_env[each.key].filename
    destination = "${each.value.deploy_base_path}/${each.key}/pos-app/.env.production"
  }

  provisioner "file" {
    source      = local_file.restaurant_nginx[each.key].filename
    destination = "${each.value.deploy_base_path}/${each.key}/nginx/default.conf"
  }

  provisioner "remote-exec" {
    inline = [
      "cd ${each.value.deploy_base_path}/${each.key}",
      "docker compose config"
    ]
  }
}

# Prints the monitor and restaurant maps after apply.
output "platform_summary" {
  value = {
    monitors    = var.monitors
    restaurants = var.restaurants
  }
}
