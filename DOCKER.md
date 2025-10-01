# Docker Setup for Gruyere

This document explains how to run the Gruyere application using Docker.

## Quick Start

### Using Docker Compose (Recommended)

1. **Build and run the application:**

   ```bash
   docker-compose up --build
   ```

2. **Run in detached mode:**

   ```bash
   docker-compose up -d --build
   ```

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Using Docker directly

1. **Build the image:**

   ```bash
   docker build -t gruyere .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3141:3141 -v $(pwd)/config:/app/config gruyere
   ```

## Configuration

### Config Files

The application uses the following configuration files that are mounted as volumes:

- `config/config.json` - Application settings
- `config/instances.json` - Pi-hole instances configuration
- `config/password.json` - Authentication password

These files are automatically created in the `./config` directory and mounted to `/app/config` inside the container.

### Port Configuration

The application runs on port **3141** by default. You can change this by:

1. **Docker Compose:** Modify the port mapping in `docker-compose.yml`
2. **Docker run:** Change the port in the `-p` flag: `-p YOUR_PORT:3141`

### Environment Variables

- `NODE_ENV=production` - Sets the application to production mode
- `PORT=3141` - Sets the internal port (default: 3141)
- `HOST=0.0.0.0` - Binds to all interfaces

## File Structure

```
gruyere/
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore          # Files to ignore during build
├── config/                # Configuration files (mounted as volume)
│   ├── config.json
│   ├── instances.json
│   └── password.json
└── src/                   # Application source code
```

## Health Check

The container includes a health check that verifies the application is responding on port 3141. You can check the health status with:

```bash
docker ps
```

Look for the "STATUS" column to see if the container is healthy.

## Troubleshooting

### Container won't start

- Check if port 3141 is already in use
- Verify the config directory exists and has proper permissions
- Check container logs: `docker logs gruyere`

### Configuration not persisting

- Ensure the config directory is properly mounted
- Check file permissions in the config directory
- Verify the files are being written to the correct location

### Performance issues

- The image uses Alpine Linux for minimal size
- Multi-stage build optimizes the final image size
- Only production dependencies are included in the final image
