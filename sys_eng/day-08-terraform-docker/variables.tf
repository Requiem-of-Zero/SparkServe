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
  default     = "192.168.1.21"
}

