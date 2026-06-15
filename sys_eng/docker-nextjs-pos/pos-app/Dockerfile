# Start from an official Node.js image based on Alpine Linux.
# This gives us Linux + Node.js already installed.
FROM node:22-alpine

# Set the working directory inside the container
# All future commands run from /app.
WORKDIR /app

# Copy dependency files first
# Docker can cache this layer if package.json hasn't changed.
COPY package.json yarn.lock ./

# Install project dependencies
RUN yarn install

# Copy the rest of the application source code.
COPY . .

# Build the Next.js production application
RUN yarn build

# This container listens on port 3000
# Does not publish the port
EXPOSE 3000

# Default command executed when the container starts.
CMD ["yarn", "start"]