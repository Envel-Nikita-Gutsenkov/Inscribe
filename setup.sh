#!/usr/bin/env bash

# Inscribe Docs - Enterprise Linux Setup & Update Tool
set -euo pipefail

echo "===================================================="
echo "      Inscribe Documentation Platform Installer      "
echo "===================================================="

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID=$ID
    OS_CODELIKE=${ID_LIKE:-$ID}
else
    OS_ID="unknown"
    OS_CODELIKE="unknown"
fi

echo "Detected OS: $OS_ID ($OS_CODELIKE)"

# Helper to check if a command exists
has_cmd() {
    command -v "$1" &>/dev/null
}

# Ensure curl or wget is installed
ensure_downloader() {
    if ! has_cmd curl && ! has_cmd wget; then
        echo "Installing curl..."
        if [[ "$OS_CODELIKE" =~ "debian" || "$OS_ID" == "ubuntu" ]]; then
            sudo apt-get update && sudo apt-get install -y curl
        elif [[ "$OS_CODELIKE" =~ "rhel" || "$OS_CODELIKE" =~ "fedora" ]]; then
            sudo dnf install -y curl || sudo yum install -y curl
        elif [[ "$OS_ID" == "arch" ]]; then
            sudo pacman -Sy --noconfirm curl
        else
            echo "Error: Please install curl or wget manually."
            exit 1
        fi
    fi
}

# Install Docker if missing
ensure_docker() {
    if ! has_cmd docker; then
        echo "Docker not found. Installing Docker safely..."
        ensure_downloader
        curl -fsSL https://get.docker.com | sh
        sudo systemctl enable --now docker
    else
        echo "Docker is already installed."
    fi

    # Check for docker compose support
    if ! docker compose version &>/dev/null && ! has_cmd docker-compose; then
        echo "Docker Compose not found. Installing docker-compose-plugin..."
        if [[ "$OS_CODELIKE" =~ "debian" || "$OS_ID" == "ubuntu" ]]; then
            sudo apt-get update && sudo apt-get install -y docker-compose-plugin
        elif [[ "$OS_CODELIKE" =~ "rhel" || "$OS_CODELIKE" =~ "fedora" ]]; then
            sudo dnf install -y docker-compose-plugin || sudo yum install -y docker-compose-plugin
        else
            echo "Please install the Docker Compose plugin manually on this distribution."
            exit 1
        fi
    fi
}

# Helper to check if port is free
is_port_free() {
    local port=$1
    if has_cmd ss; then
        ! ss -lntp 2>/dev/null | grep -q ":$port "
    elif has_cmd netstat; then
        ! netstat -lnt 2>/dev/null | grep -q ":$port "
    elif has_cmd lsof; then
        ! lsof -i :"$port" -t &>/dev/null
    else
        # Fallback to python socket check
        python3 -c "import socket; s = socket.socket(); s.bind(('127.0.0.1', $port))" &>/dev/null
    fi
}

# Auto-detect free ports
find_free_port() {
    local start_port=$1
    local port=$start_port
    while ! is_port_free "$port"; do
        echo "Port $port is currently occupied. Checking next port..."
        port=$((port + 1))
    done
    echo "$port"
}

# Execute installation steps
ensure_docker

# Read or generate configurations
ENV_FILE=".env.production"
CURRENT_PORT=3000
CURRENT_DOMAIN="localhost"
JWT_SECRET=""
INITIAL_ADMIN_USERNAME=""
INITIAL_ADMIN_ONE_TIME_CODE=""
IS_UPDATE=false

if [ -f "$ENV_FILE" ] && [ -f "data/db.sqlite" ]; then
    IS_UPDATE=true
fi

if [ -f "$ENV_FILE" ]; then
    echo "Loading existing configuration from $ENV_FILE..."
    # Parse existing values safely
    CURRENT_PORT=$(grep -E "^INSCRIBE_PORT=" "$ENV_FILE" | cut -d'=' -f2- || echo "3000")
    CURRENT_DOMAIN=$(grep -E "^INSCRIBE_ADMIN_DOMAIN=" "$ENV_FILE" | cut -d'=' -f2- || echo "localhost")
    JWT_SECRET=$(grep -E "^INSCRIBE_JWT_SECRET=" "$ENV_FILE" | cut -d'=' -f2- || echo "")
    INITIAL_ADMIN_USERNAME=$(grep -E "^INSCRIBE_INITIAL_ADMIN_USERNAME=" "$ENV_FILE" | cut -d'=' -f2- || echo "")
    INITIAL_ADMIN_ONE_TIME_CODE=$(grep -E "^INSCRIBE_INITIAL_ADMIN_ONE_TIME_CODE=" "$ENV_FILE" | cut -d'=' -f2- || echo "")
fi

# Prompt to reset/delete old data (defaults to keeping)
echo ""
read -rp "Do you want to reset/delete all existing database files and configurations (clean install)? [y/N]: " RESET_DATA
RESET_DATA=${RESET_DATA:-n}

if [[ "$RESET_DATA" =~ ^[Yy]$ ]]; then
    echo "Resetting configurations and database..."
    rm -f "$ENV_FILE"
    rm -f .env
    rm -rf data/
    INSCRIBE_PORT=$CURRENT_PORT docker compose -f deploy/docker-compose.yml down -v --remove-orphans &>/dev/null || true
    CURRENT_PORT=3000
    CURRENT_DOMAIN="localhost"
    JWT_SECRET=""
    INITIAL_ADMIN_USERNAME=""
    INITIAL_ADMIN_ONE_TIME_CODE=""
    IS_UPDATE=false
fi

# Prompt user for domain hostname
echo ""
read -rp "Enter Inscribe Admin Domain [$CURRENT_DOMAIN]: " USER_DOMAIN
USER_DOMAIN=${USER_DOMAIN:-$CURRENT_DOMAIN}

# Port Allocation
if [ -z "${CURRENT_PORT:-}" ] || [ "$CURRENT_PORT" == "3000" ]; then
    echo "Scanning for a free port starting from 3000..."
    FREE_PORT=$(find_free_port 3000)
else
    FREE_PORT=$CURRENT_PORT
fi

read -rp "Enter Host Port to bind Inscribe to [$FREE_PORT]: " USER_PORT
USER_PORT=${USER_PORT:-$FREE_PORT}

if ! is_port_free "$USER_PORT" && [ "$USER_PORT" != "$CURRENT_PORT" ]; then
    echo "WARNING: Port $USER_PORT is occupied. Scanning for next free port..."
    USER_PORT=$(find_free_port "$USER_PORT")
    echo "Assigned Port: $USER_PORT"
fi

# Generate JWT secret if not set
if [ -z "$JWT_SECRET" ]; then
    echo "Generating new random secure JWT secret key..."
    if has_cmd openssl; then
        JWT_SECRET=$(openssl rand -hex 32)
    else
        JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || echo "fallback-secret-$(date +%s)")
    fi
fi

# Generate initial admin username if not set (only for fresh installations)
if [ "$IS_UPDATE" = "false" ] && [ -z "$INITIAL_ADMIN_USERNAME" ]; then
    echo "Generating new random admin username..."
    if has_cmd python3; then
        INITIAL_ADMIN_USERNAME=$(python3 -c "
import random
adjectives = ['swift', 'bold', 'keen', 'calm', 'wise', 'bright', 'sharp', 'noble']
nouns = ['falcon', 'cedar', 'stone', 'river', 'ember', 'coast', 'forge', 'vale']
print(f'{random.choice(adjectives)}-{random.choice(nouns)}-{random.randint(1000, 9999)}')
" 2>/dev/null || echo "admin-$(date +%s | cut -c 6-10)")
    else
        INITIAL_ADMIN_USERNAME="admin-$(date +%s | cut -c 6-10)"
    fi
fi

# Generate initial admin one-time entry code if not set (only for fresh installations)
if [ "$IS_UPDATE" = "false" ] && [ -z "$INITIAL_ADMIN_ONE_TIME_CODE" ]; then
    echo "Generating new random admin one-time entry code..."
    if has_cmd openssl; then
        INITIAL_ADMIN_ONE_TIME_CODE=$(openssl rand -hex 4 | tr -d -c '0-9' | cut -c 1-6)
        if [ ${#INITIAL_ADMIN_ONE_TIME_CODE} -ne 6 ]; then
            INITIAL_ADMIN_ONE_TIME_CODE=""
        fi
    fi
    if [ -z "$INITIAL_ADMIN_ONE_TIME_CODE" ]; then
        if has_cmd python3; then
            INITIAL_ADMIN_ONE_TIME_CODE=$(python3 -c "import random; print(random.randint(100000, 999999))" 2>/dev/null || echo "123456")
        else
            INITIAL_ADMIN_ONE_TIME_CODE="123456"
        fi
    fi
fi

# Write updated configuration back
cat <<EOF > "$ENV_FILE"
# Inscribe Production Environment Config
INSCRIBE_PORT=$USER_PORT
INSCRIBE_ADMIN_DOMAIN=$USER_DOMAIN
INSCRIBE_JWT_SECRET=$JWT_SECRET
EOF

if [ "$IS_UPDATE" = "false" ]; then
    cat <<EOF >> "$ENV_FILE"
INSCRIBE_INITIAL_ADMIN_USERNAME=$INITIAL_ADMIN_USERNAME
INSCRIBE_INITIAL_ADMIN_ONE_TIME_CODE=$INITIAL_ADMIN_ONE_TIME_CODE
EOF
fi

echo "INSCRIBE_PORT=$USER_PORT" > .env

echo "Configurations successfully saved to $ENV_FILE."
echo "Port: $USER_PORT"
echo "Admin Domain: $USER_DOMAIN"

# Deploy / Update App
echo ""
echo "Deploying application containers..."
INSCRIBE_PORT=$USER_PORT docker compose -f deploy/docker-compose.yml down --remove-orphans || true
INSCRIBE_PORT=$USER_PORT docker compose -f deploy/docker-compose.yml up -d --build

# Cleanup dangling build layers
echo "Pruning dangling Docker images..."
docker image prune -f

# Run Health Check verification
echo "Waiting for health check verification..."
MAX_ATTEMPTS=6
ATTEMPT=1
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "Checking health status (Attempt $ATTEMPT/$MAX_ATTEMPTS)..."
    STATUS=$(docker inspect --format='{{json .State.Health.Status}}' inscribe-app 2>/dev/null || echo '"unhealthy"')
    if [ "$STATUS" == '"healthy"' ]; then
        # Configure host Nginx if present
        NGINX_CONFIGURED=false
        if [ -d "/etc/nginx/sites-available" ]; then
            echo ""
            read -rp "Detected host Nginx. Do you want to automatically configure an Nginx virtual host for $USER_DOMAIN? [y/N]: " CONF_NGINX
            CONF_NGINX=${CONF_NGINX:-n}
            if [[ "$CONF_NGINX" =~ ^[Yy]$ ]]; then
                NGINX_CONF="/etc/nginx/sites-available/inscribe.conf"
                echo "Creating Nginx configuration at $NGINX_CONF..."
                
                # Check for existing Let's Encrypt certificates
                SSL_CERT="/etc/letsencrypt/live/$USER_DOMAIN/fullchain.pem"
                SSL_KEY="/etc/letsencrypt/live/$USER_DOMAIN/privkey.pem"
                
                if [ ! -f "$SSL_CERT" ]; then
                    SSL_CERT="/etc/ssl/certs/inscribe-$USER_DOMAIN.crt"
                    SSL_KEY="/etc/ssl/private/inscribe-$USER_DOMAIN.key"
                    if [ ! -f "$SSL_CERT" ]; then
                        echo "Generating self-signed SSL certificate fallback (for Cloudflare / test)..."
                        sudo mkdir -p /etc/ssl/certs /etc/ssl/private
                        sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
                            -keyout "$SSL_KEY" \
                            -out "$SSL_CERT" \
                            -subj "/CN=$USER_DOMAIN/O=Inscribe/C=US" &>/dev/null
                    fi
                fi
                
                sudo tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80;
    server_name $USER_DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $USER_DOMAIN;

    ssl_certificate $SSL_CERT;
    ssl_certificate_key $SSL_KEY;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    client_max_body_size 4m;
    client_body_timeout 15s;
    client_header_timeout 15s;
    send_timeout 15s;
    keepalive_timeout 65s;
    keepalive_requests 200;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_vary on;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:$USER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /admin/login {
        proxy_pass http://127.0.0.1:$USER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
    }

    location /api/search {
        proxy_pass http://127.0.0.1:$USER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:$USER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffers 8 16k;
        proxy_buffer_size 32k;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
EOF
                sudo ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/inscribe.conf"
                echo "Testing Nginx configuration..."
                if sudo nginx -t &>/dev/null; then
                    echo "Reloading Nginx..."
                    sudo systemctl reload nginx || sudo service nginx reload &>/dev/null || true
                    NGINX_CONFIGURED=true
                    echo "Nginx successfully configured!"
                else
                    echo "WARNING: Nginx configuration test failed. Please check $NGINX_CONF manually."
                fi
            fi
        fi

        echo "===================================================="
        echo "SUCCESS: Inscribe Documentation Platform is fully healthy!"
        if [ "$NGINX_CONFIGURED" = "true" ]; then
            echo "Admin Domain URL: https://$USER_DOMAIN/admin"
        else
            echo "Running on Port: $USER_PORT"
            echo "Admin Domain URL: http://$USER_DOMAIN:$USER_PORT/admin"
        fi
        echo ""
        echo "INITIAL SUPERADMIN CREDENTIALS:"
        echo "Username:            $INITIAL_ADMIN_USERNAME"
        echo "One-Time Entry Code: $INITIAL_ADMIN_ONE_TIME_CODE"
        echo "Use these credentials to log in and configure your 2FA."
        echo "===================================================="
        exit 0
    fi
    sleep 5
    ATTEMPT=$((ATTEMPT + 1))
done

echo "WARNING: Application is taking longer than expected to report healthy status."
echo "You can check container logs using: docker logs inscribe-app"
exit 1
