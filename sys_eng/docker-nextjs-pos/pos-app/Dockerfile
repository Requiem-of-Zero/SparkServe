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

# Pass build-time environment variables to Next.js
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_DEPLOYMENT_ENV
ARG DATABASE_URL=postgresql://pos_user:pos_password@postgres:5432/pos_db
ARG BETTER_AUTH_URL=http://localhost:3000
ARG BETTER_AUTH_SECRET=build-time-placeholder-secret-32-chars

ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_DEPLOYMENT_ENV=$NEXT_PUBLIC_DEPLOYMENT_ENV

# Build the Next.js production application
RUN DATABASE_URL=$DATABASE_URL \
    BETTER_AUTH_URL=$BETTER_AUTH_URL \
    BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET \
    yarn build

# This container listens on port 3000
# Does not publish the port
EXPOSE 3000

# Default command executed when the container starts.
CMD ["yarn", "start"]
