# Prints the monitor and restaurant maps after apply.
output "platform_summary" {
  value = {
    monitors    = var.monitors
    restaurants = var.restaurants
  }
}
