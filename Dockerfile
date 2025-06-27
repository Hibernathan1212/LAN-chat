FROM node:alpine AS build

# RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY app/package*.json ./

WORKDIR /app

# Install build essentials and Python for better-sqlite3 compilation
# apk add is the package manager for Alpine Linux
RUN apk add --no-cache python3 make g++

# Copy package.json and package-lock.json first to leverage Docker cache
COPY app/package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY app/ .

FROM node:alpine

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/server.js ./server.js

EXPOSE 3000

ENV DB_PATH=/data/chat.db
ENV PORT=3000

# Command to run the application
CMD ["node", "server.js"]