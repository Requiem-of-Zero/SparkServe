# Restaurant POS hosts managed by this platform. Each map key becomes a
# restaurant slug used for generated folders, container names, and deployments.
variable "restaurants" {
  description = "Restaurant POS hosts managed by this platform. Each map key becomes the restaurant slug used for folders, containers, and generated files."
  type = map(object({
    name             = string
    host             = string
    domain           = string
    ssh_user         = string
    deploy_base_path = string
    db_name          = string
    db_user          = string
    db_password      = string
  }))
  default = {
    big-fish-house = {
      name             = "bfh-restaurant"
      host             = "192.168.1.28"
      domain           = "bfh-restaurant.samuelwong.xyz"
      ssh_user         = "sungjinwong"
      deploy_base_path = "/home/sungjinwong/samwo-platform/restaurants"
      db_name          = "pos_db"
      db_user          = "pos_user"
      db_password      = "pos_password"
    }
  }
}

# Private key Terraform uses from the HQ machine when SSHing into restaurant hosts.
variable "ssh_private_key_path" {
  description = "Private SSH key used by Terraform on the HQ machine to connect to restaurant hosts."
  type        = string
  default     = "~/.ssh/id_ed25519"
}

# Grafana SMTP settings for email alert delivery. Override these in an ignored
# terraform.tfvars file or with TF_VAR_grafana_smtp when using real credentials.
variable "grafana_smtp" {
  description = "SMTP settings Grafana uses to send alert emails."
  type = object({
    enabled      = bool
    host         = string
    user         = string
    password     = string
    from_address = string
    from_name    = string
  })
  sensitive = true
  default = {
    enabled      = false
    host         = ""
    user         = ""
    password     = ""
    from_address = ""
    from_name    = "Samwo Grafana"
  }
}

# Legacy single-restaurant variables from the first learning step.
# The current scalable model uses var.restaurants instead.
variable "restaurant_name" {
  description = "Name for restaurant"
  type        = string
  default     = "default-restaurant-name"
}

# Legacy single-restaurant domain from the first learning step.
# The current scalable model uses var.restaurants instead.
variable "restaurant_domain" {
  description = "DNS name that will route traffic to pos app"
  type        = string
  default     = "default-restaurant.samuelwong.xyz"
}

# Legacy single-restaurant host from the first learning step.
# The current scalable model uses var.restaurants instead.
variable "restaurant_host" {
  description = "IP address or hostname of the Ubuntu machine"
  type        = string
  default     = "192.168.1.28"
}

# Monitoring hosts for Prometheus/Grafana. This is a map so a backup monitor
# can be added later without changing the template/resource pattern.
variable "monitors" {
  description = "Monitoring hosts that run platform observability services. The map shape allows adding a backup monitor later."
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

# Legacy single-monitor variables from the first learning step.
# The current scalable model uses var.monitors instead.
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
