variable "restaurants" {
  description = "Restaurant POS hosts managed by this platform."
  type = map(object({
    name             = string
    host             = string
    domain           = string
    ssh_user         = string
    deploy_base_path = string
  }))
  default = {
    default = {
      name             = "default-restaurant"
      host             = "192.168.1.28"
      domain           = "default-restaurant.samuelwong.xyz"
      ssh_user         = "sungjinwong"
      deploy_base_path = "/home/sungjinwong/samwo-platform/restaurants"
    }
  }
}

variable "ssh_private_key_path" {
  description = "Private SSH key used by Terraform to connect to restaurant hosts."
  type        = string
  default     = "~/.ssh/id_ed25519"
}

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

variable "monitors" {
  description = "Monitoring hosts that run platform observability services"
  type = map(object({
    name   = string
    host   = string
    domain = string
  }))
  default = {
    primary = {
      name   = "central-monitor"
      host   = "192.168.1.58"
      domain = "monitor.samuelwong.xyz"
    }
  }
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
