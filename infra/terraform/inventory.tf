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
