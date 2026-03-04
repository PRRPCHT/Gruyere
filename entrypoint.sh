#!/bin/sh
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored message
log_info() {
    echo "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo "${RED}[ERROR]${NC} $1"
}

# Initialize config files from templates if they don't exist
initialize_config() {
    log_info "Checking configuration files..."

    # Check if config directory exists
    if [ ! -d "/app/config" ]; then
        log_error "Config directory /app/config does not exist!"
        exit 1
    fi

    # Initialize password.json if it doesn't exist
    if [ ! -f "/app/config/password.json" ]; then
        log_warn "password.json not found, creating from template..."
        if [ -f "/app/config/password.example.json" ]; then
            cp /app/config/password.example.json /app/config/password.json
            log_info "Created password.json with default password 'admin' - PLEASE CHANGE THIS!"
        else
            log_error "password.example.json template not found!"
            exit 1
        fi
    fi

    # Initialize instances.json if it doesn't exist
    if [ ! -f "/app/config/instances.json" ]; then
        log_warn "instances.json not found, creating from template..."
        if [ -f "/app/config/instances.example.json" ]; then
            cp /app/config/instances.example.json /app/config/instances.json
            log_info "Created instances.json - please configure your Pi-hole instances"
        else
            log_error "instances.example.json template not found!"
            exit 1
        fi
    fi

    # Initialize config.json if it doesn't exist
    if [ ! -f "/app/config/config.json" ]; then
        log_warn "config.json not found, creating from template..."
        if [ -f "/app/config/config.example.json" ]; then
            cp /app/config/config.example.json /app/config/config.json
            log_info "Created config.json with default settings"
        else
            log_error "config.example.json template not found!"
            exit 1
        fi
    fi

    log_info "Configuration files initialized successfully"
}

# Fix permissions for mounted volumes
fix_permissions() {
    log_info "Fixing config directory permissions..."

    # If running as root, fix ownership and switch to non-root user
    if [ "$(id -u)" = "0" ]; then
        chown -R sveltekit:nodejs /app/config
        log_info "Permissions fixed, switching to non-root user 'sveltekit'"
        return 0
    else
        log_info "Already running as non-root user"
        return 1
    fi
}

# Validate configuration
validate_config() {
    log_info "Validating configuration..."

    # Check if Node.js is available
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js is not installed!"
        exit 1
    fi

    # Check if build directory exists
    if [ ! -d "/app/build" ]; then
        log_error "Build directory not found! Application may not be built correctly."
        exit 1
    fi

    log_info "Configuration validated successfully"
}

# Graceful shutdown handler
shutdown() {
    log_info "Received shutdown signal, stopping gracefully..."
    # Kill the Node.js process
    if [ ! -z "$NODE_PID" ]; then
        kill -TERM "$NODE_PID" 2>/dev/null || true
        wait "$NODE_PID" 2>/dev/null || true
    fi
    log_info "Shutdown complete"
    exit 0
}

# Set up signal handlers
trap shutdown SIGTERM SIGINT SIGQUIT

# Main execution
main() {
    log_info "Starting Gruyere..."
    log_info "Node.js version: $(node --version)"
    log_info "Environment: ${NODE_ENV:-production}"

    # Initialize configuration
    initialize_config

    # Fix permissions and determine if we need to switch users
    if fix_permissions; then
        # We were root, so switch to sveltekit user
        validate_config
        log_info "Starting application as user 'sveltekit'..."
        exec su-exec sveltekit "$@" &
    else
        # Already non-root
        validate_config
        log_info "Starting application..."
        exec "$@" &
    fi

    # Store the PID for signal handling
    NODE_PID=$!

    # Wait for the process
    wait $NODE_PID
}

# Run main function with all arguments
main "$@"
