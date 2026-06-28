variable "restaurant_name" {
  description = "Name for restaurant"
  type        = string
  default     = "default-restaurant-name"
}

variable "restaurant_domain" {
  description = "DNS name that will route traffic to pos app"
  type        = string
  default     = "default-restaurant.samuelwong.xyz"
}

variable "restaurant_host" {
  description = "IP address or hostname of the Ubuntu machine"
  type        = string
  default     = "192.168.1.28"
}

variable "monitor_name" {
  description = "Name for central monitoring host"
  type        = string
  default     = "central-monitor"
}

variable "monitor_domain" {
  description = "DNS name that will route traffic to the monitoring server"
  type        = string
  default     = "monitor.samuelwong.xyz"
}

variable "monitor_host" {
  description = "IP address of hostname of the Ubuntu machine running Prometheus and Grafana"
  type        = string
  default     = "192.168.1.58"
}
