# Personal LAN Chat

A simple, self-hosted chat application designed for private use on your local network. No external servers, no accounts, just a shared message board for your home or small group.

## Features

*   **Self-Hosted:** You run it on your own hardware, retaining full control over your data.
*   **Local Network Only:** Designed to be accessible only by devices on your local network.
*   **Persistent Messages:** Messages are stored in a SQLite database, so they remain even if the server restarts.
*   **Real-time:** Uses WebSockets for instant message delivery to all connected clients.
*   **Minimalist:** Focused on core chat functionality without complex features.

## Requirements

*   Docker installed on your host machine (e.g., a Raspberry Pi, an old PC, or your main computer).

## Setup & Running (Docker)

There are two primary ways to run this application with Docker: using `docker-compose` (recommended for development and easier management) or `docker run` (for a simpler command line approach).

### 1. Using Docker Compose (Recommended)

This method simplifies building and running your container with persistent storage.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/hibernathan1212/lan-chat.git
    cd lan-chat
    ```
2.  **Build and run the container:**
    ```bash
    docker-compose up -d --build
    ```
    *   `up`: Starts the services defined in `docker-compose.yml`.
    *   `-d`: Runs the containers in detached mode (in the background).
    *   `--build`: Builds the Docker image before starting (necessary the first time or after `Dockerfile` changes).

3.  **Verify the container is running:**.
    ```bash
    docker-compose ps
    ```
    You should see `lan-chat-app` listed with a `State` of `Up`.

4.  **Access the chat:**
    Open your web browser and navigate to:
    `http://YOUR_DOCKER_HOST_IP:3000`

    *Replace `YOUR_DOCKER_HOST_IP` with the actual IP address of the machine where you are running Docker (e.g., `http://192.168.1.100:3000`).*

### 2. Using `docker run` (Alternative)

If you prefer a single command, you can use `docker run`.

1.  **Build the Docker image:**
    Navigate to the root directory of your `lan-chat` project (where `Dockerfile` is).
    ```bash
    docker build -t lan-chat-image .
    ```
    *   `lan-chat-image` is the name you're giving to your Docker image.

2.  **Create a Docker Volume for persistent data:**
    It's recommended to create a named volume to ensure your chat history persists even if you remove the container.
    ```bash
    docker volume create lan_chat_data
    ```

3.  **Run the Docker container:**
    ```bash
    docker run -d \
      --name lan-chat-app \
      -p 3000:3000 \
      -v lan_chat_data:/data \
      lan-chat-image
    ```
    *   `-d`: Runs in detached mode.
    *   `--name lan-chat-app`: Assigns a name to your container.
    *   `-p 3000:3000`: Maps port `3000` on your host machine to port `3000` inside the container.
    *   `-v lan_chat_data:/data`: Mounts the named volume `lan_chat_data` to the `/data` directory inside the container. This is where your `chat.db` will be stored.
    *   `lan-chat-image`: The name of the image you just built.

4.  **Access the chat:**
    Open your web browser and navigate to:
    `http://YOUR_DOCKER_HOST_IP:3000`

    *Replace `YOUR_DOCKER_HOST_IP` with the actual IP address of the machine where you are running Docker.*

### Stopping and Managing

*   **If using `docker-compose`:**
    To stop and remove the container (but keep the data volume):
    ```bash
    docker-compose down
    ```
    To stop and remove the container *and* the data volume (will delete chat history!):
    ```bash
    docker-compose down -v
    ```
*   **If using `docker run`:**
    To stop the container:
    ```bash
    docker stop lan-chat-app
    ```
    To restart the container:
    ```bash
    docker start lan-chat-app
    ```
    To remove the container (leaves the volume):
    ```bash
    docker rm lan-chat-app
    ```
    To remove the data volume (will delete chat history!):
    ```bash
    docker volume rm lan_chat_data
    ```

## Development (Local without Docker)

If you want to modify the code and test quickly without rebuilding Docker images every time:

1.  Navigate to the `lan-chat/app/` directory.
2.  Install dependencies: `npm install`
3.  Run the server: `npm start`
4.  Open your browser to `http://localhost:3000`

