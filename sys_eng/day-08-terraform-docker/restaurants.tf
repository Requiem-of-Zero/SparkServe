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

# Generates one Prometheus Agent config per restaurant for remote_write.
resource "local_file" "restaurant_prometheus_agent" {
  for_each = var.restaurants

  filename = "${path.module}/generated/restaurants/${each.key}/prometheus/prometheus.yml"

  file_permission      = "0644"
  directory_permission = "0755"

  content = templatefile("${path.module}/templates/restaurant-prometheus-agent.yml.tftpl", {
    restaurant_key   = each.key
    restaurant       = each.value
    remote_write_url = var.prometheus_remote_write_url
  })
}

# Pushes each generated restaurant bundle to its Ubuntu host over SSH.
resource "null_resource" "push_restaurant_compose" {
  for_each = var.restaurants

  triggers = {
    compose_sha = local_file.restaurant_compose[each.key].content_sha256
    env_sha     = local_file.restaurant_env[each.key].content_sha256
    nginx_sha   = local_file.restaurant_nginx[each.key].content_sha256
    agent_sha   = local_file.restaurant_prometheus_agent[each.key].content_sha256
  }

  connection {
    type        = "ssh"
    host        = each.value.host
    user        = each.value.ssh_user
    private_key = file(pathexpand(var.ssh_private_key_path))
  }

  # Create the remote deployment directory and subfolders used by mounted configs.
  provisioner "remote-exec" {
    inline = [
      "mkdir -p ${each.value.deploy_base_path}/${each.key}/pos-app ${each.value.deploy_base_path}/${each.key}/nginx ${each.value.deploy_base_path}/${each.key}/prometheus"
    ]
  }

  # Upload the generated Docker Compose file for this restaurant.
  provisioner "file" {
    source      = local_file.restaurant_compose[each.key].filename
    destination = "${each.value.deploy_base_path}/${each.key}/docker-compose.yml"
  }

  # Upload the POS app source so the restaurant host can build the app image.
  provisioner "file" {
    source      = "${path.module}/../docker-nextjs-pos/pos-app"
    destination = "${each.value.deploy_base_path}/${each.key}"
  }

  # Upload the generated app/database environment file.
  provisioner "file" {
    source      = local_file.restaurant_env[each.key].filename
    destination = "${each.value.deploy_base_path}/${each.key}/pos-app/.env.production"
  }

  # Upload the generated NGINX reverse-proxy config.
  provisioner "file" {
    source      = local_file.restaurant_nginx[each.key].filename
    destination = "${each.value.deploy_base_path}/${each.key}/nginx/default.conf"
  }

  # Upload the generated Prometheus Agent config for remote_write.
  provisioner "file" {
    source      = local_file.restaurant_prometheus_agent[each.key].filename
    destination = "${each.value.deploy_base_path}/${each.key}/prometheus/prometheus.yml"
  }

  # Validate the remote Compose project without starting or restarting services.
  provisioner "remote-exec" {
    inline = [
      "cd ${each.value.deploy_base_path}/${each.key}",
      "docker compose config"
    ]
  }
}
