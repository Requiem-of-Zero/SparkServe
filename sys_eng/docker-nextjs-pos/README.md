# Docker Next.js POS App

This project is the application deployment part of the systems engineering homelab. The app is a small restaurant point-of-sale interface built with Next.js and deployed with Docker Compose behind an NGINX reverse proxy.

This section currently covers the work starting around Day 4. Days 5 through 8 are planned next steps and will be filled in as the stack grows.

Product roadmap:

```text
POS_PLATFORM_PLAN.md
```

---

## Current Architecture

```text
Browser
  |
  | http://localhost:8080
  |
NGINX container
  |
  | proxy_pass http://pos-app:3000
  |
Next.js POS app container
```

The browser only talks to NGINX. The Next.js app is kept on an internal Docker network and is reached by NGINX using Docker service discovery.

---

## Services

### nginx

- Uses the official `nginx` image.
- Publishes port `8080` on the host to port `80` in the container.
- Mounts `./nginx/default.conf` into the container as the NGINX site config.
- Connects to both Docker networks:
  - `frontend-net`
  - `app-net`

### pos-app

- Builds from `./pos-app/Dockerfile`.
- Runs the Next.js production server on port `3000`.
- Uses `NODE_ENV=production`.
- Only connects to the internal `app-net` network.

---

## Important Files

```text
docker-compose.yml
```

Defines the multi-container app: NGINX plus the Next.js POS application.

```text
nginx/default.conf
```

Configures NGINX to reverse proxy requests to the `pos-app` service.

```text
pos-app/Dockerfile
```

Builds the Next.js app image using Node.js, installs dependencies, builds the app, and starts it with `yarn start`.

```text
pos-app/app/page.tsx
```

Main POS interface. It currently supports adding menu items to an order, calculating totals, and clearing the order.

---

## How To Run

From this directory:

```bash
docker compose up --build
```

Then open:

```text
http://localhost:8080
```

To stop the containers:

```bash
docker compose down
```

---

## Day 4 - Next.js App Deployment

Current focus:

- [x] Create a basic restaurant POS app with Next.js
- [x] Create a Dockerfile for the Next.js app
- [x] Build the app inside a container
- [x] Run the app with `yarn start`
- [x] Put NGINX in front of the app
- [x] Use Docker Compose to run both services together
- [x] Use Docker DNS so NGINX can reach `pos-app`
- [x] Keep the app container off the public host port
- [x] Add `.gitignore` rules for install/build artifacts

Concepts learned:

- A Dockerfile describes how to build one image.
- Docker Compose describes how multiple containers run together.
- NGINX can act as a reverse proxy in front of an application.
- Docker services can find each other by service name on the same network.
- Host ports are only needed for services that should be reachable from outside Docker.

---

## Day 5 - Database Infrastructure

Planned:

- [ ] Add a PostgreSQL container
- [ ] Create a database volume for persistent storage
- [ ] Connect the Next.js app to PostgreSQL over the internal Docker network
- [ ] Learn what data should and should not live inside a container
- [ ] Practice backup and restore basics

---

## Day 6 - Monitoring And Observability

Planned:

- [ ] Add Prometheus
- [ ] Add Grafana
- [ ] Learn the difference between logs, metrics, and dashboards
- [ ] Monitor container and application health
- [ ] Create a basic dashboard for the POS stack

---

## Day 7 - Cloud Infrastructure

Planned:

- [ ] Prepare the app for deployment to a cloud VM
- [ ] Review public vs private networking
- [ ] Configure firewall or security group rules
- [ ] Practice SSH access to cloud infrastructure
- [ ] Compare local homelab deployment with cloud deployment

---

## Day 8 - Infrastructure As Code

Planned:

- [ ] Introduce Terraform
- [ ] Define cloud resources in code
- [ ] Learn providers, resources, variables, and state
- [ ] Use Terraform to create or manage infrastructure
- [ ] Understand why state files must be protected

---

## Notes

Do commit:

- Source code
- Dockerfiles
- Docker Compose files
- NGINX config
- Package manifests and lockfiles
- Documentation

Do not commit:

- `node_modules/`
- `.next/`
- `out/`
- local `.env` files
- logs and local cache files
