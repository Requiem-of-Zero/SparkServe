# Restaurant POS hosts managed by this platform. Each map key becomes a
# restaurant slug used for generated folders, container names, and deployments.
variable "restaurants" {
  description = "Restaurant POS hosts managed by this platform. Each map key becomes the restaurant slug used for folders, containers, and generated files."
  type = map(object({
    name   = string
    host   = string
    domain = string
    # Public base URL Better Auth uses when creating redirects and session cookies.
    app_url          = optional(string, "http://localhost:8080")
    ssh_user         = string
    deploy_base_path = string
    db_name          = string
    db_user          = string
    db_password      = string
    # Per-restaurant auth secret. Override this in terraform.tfvars for real deployments.
    better_auth_secret = optional(string, "change-me-to-a-32-character-secret")
  }))
  default = {
    big-fish-house = {
      name               = "bfh-restaurant"
      host               = "192.168.1.28"
      domain             = "bfh-restaurant.samuelwong.xyz"
      app_url            = "http://192.168.1.28:8080"
      ssh_user           = "sungjinwong"
      deploy_base_path   = "/home/sungjinwong/samwo-platform/restaurants"
      db_name            = "pos_db"
      db_user            = "pos_user"
      db_password        = "pos_password"
      better_auth_secret = "change-me-to-a-32-character-secret"
    }
  }
}

# Per-restaurant customer OAuth credentials. Keep this in terraform.tfvars or
# TF_VAR_restaurant_google_oauth because client secrets should not be committed.
variable "restaurant_google_oauth" {
  description = "Google OAuth settings keyed by restaurant slug."
  type = map(object({
    enabled       = bool
    client_id     = string
    client_secret = string
  }))
  sensitive = true
  default   = {}
}

# Per-restaurant Stripe keys and connected-account routing. Keep this in
# terraform.tfvars or TF_VAR_restaurant_stripe because secret keys should not be committed.
variable "restaurant_stripe" {
  description = "Stripe payment settings keyed by restaurant slug."
  type = map(object({
    secret_key           = string
    publishable_key      = string
    connected_account_id = optional(string, "")
    webhook_secret       = optional(string, "")
  }))
  sensitive = true
  default   = {}
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

# Remote-write endpoint that restaurant Prometheus agents send metrics to.
variable "prometheus_remote_write_url" {
  description = "Central Prometheus remote_write receiver endpoint."
  type        = string
  default     = "http://192.168.1.58:9090/api/v1/write"
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
