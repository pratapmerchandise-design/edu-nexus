#!/usr/bin/env bash
# ==============================================================================
# EduNexus — Fast Production Update & Free SSL (HTTPS) Setup
# ==============================================================================

set -e

REPO_DIR="/var/www/edunexus"
cd "$REPO_DIR"

echo "======================================================"
echo "  🚀 Fast Updating EduNexus & Securing with HTTPS     "
echo "======================================================"

echo "[1/4] Pulling latest code..."
sudo chown -R $USER:$USER "$REPO_DIR"
git fetch origin main
git reset --hard origin/main

echo "[2/4] Updating Nginx domain configuration..."
sudo bash -c "cat <<EOF > /etc/nginx/sites-available/edunexus
server {
    listen 80;
    server_name edu-nexus.online www.edu-nexus.online 13.233.251.57 _;

    client_max_body_size 50M;

    root $REPO_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \\\$uri \\\$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8000/uploads/;
        proxy_set_header Host \\\$host;
    }
}
EOF"

sudo nginx -t
sudo systemctl reload nginx

echo "[3/4] Compiling latest frontend (Favicon, Title, Light/Dark mode, SEO)..."
cd "$REPO_DIR/frontend"
npx vite build
cd "$REPO_DIR"

sudo systemctl restart edunexus
sudo systemctl reload nginx

echo "[4/4] Activating Free SSL Certificate (HTTPS) for edu-nexus.online..."
sudo certbot --nginx -d edu-nexus.online -d www.edu-nexus.online --non-interactive --agree-tos -m edunexus.infodesk@gmail.com --redirect || true

echo "======================================================"
echo "  🎉 EduNexus is Secure & Updated with HTTPS!         "
echo "======================================================"
echo "🌐 Secure URL:      https://edu-nexus.online"
echo "🌐 WWW URL:         https://www.edu-nexus.online"
echo "🔑 Login:           https://edu-nexus.online/login"
echo "======================================================"
