# Generates one Docker Compose file per monitor.
resource "local_file" "monitor_compose" {
  for_each = var.monitors

  filename = "${path.module}/generated/monitors/${each.key}/docker-compose.yml"

  file_permission      = "0644"
  directory_permission = "0755"

  content = templatefile("${path.module}/templates/monitor-compose.yml.tftpl", {
    monitor_key = each.key
    monitor     = each.value
  })
}

# Generates one Prometheus scrape config per monitor.
resource "local_file" "monitor_prometheus" {
  for_each = var.monitors

  filename = "${path.module}/generated/monitors/${each.key}/prometheus/prometheus.yml"

  file_permission      = "0644"
  directory_permission = "0755"

  content = templatefile("${path.module}/templates/monitor-prometheus.yml.tftpl", {
    monitor     = each.value
    restaurants = var.restaurants
  })
}

# Generates one Grafana SMTP environment file per monitor.
resource "local_file" "monitor_grafana_env" {
  for_each = var.monitors

  filename = "${path.module}/generated/monitors/${each.key}/grafana.env"

  file_permission      = "0600"
  directory_permission = "0755"

  content = templatefile("${path.module}/templates/monitor-grafana.env.tftpl", {
    smtp = var.grafana_smtp
  })
}
