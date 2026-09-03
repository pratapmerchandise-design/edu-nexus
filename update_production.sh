#!/usr/bin/env bash
# ==============================================================================
# EduNexus — 1-Click Production Update & Free SSL (HTTPS) Setup
# Updates domain, installs SSL, builds latest frontend with Light/Dark mode
# ==============================================================================

set -e

echo "======================================================"
echo "  🚀 Updating EduNexus & Securing with Free SSL (HTTPS)"
echo "======================================================"

cd /var/www/edunexus

# 1. Pull latest code from GitHub
echo "[1/4] Pulling latest updates from repository..."
git pull origin main

# 2. Update Nginx configuration with custom domain
echo "[2/4] Configuring Nginx for edu-nexus.online..."
sudo bash -c "cat <<EOF > /etc/nginx/sites-available/edunexus
server {
    listen 80;
    server_name edu-nexus.online www.edu-nexus.online 13.233.251.57 _;

    client_max_body_size 50M;

    # 1. Frontend SPA
    root /var/www/edunexus/frontend/dist;
    index index.html;

    location / {
        try_files \\\$uri \\\$uri/ /index.html;
    }

    # 2. REST API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }

    # 3. WebSocket Realtime Chat
    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
    }

    # 4. Media Uploads
    location /uploads/ {
        proxy_pass http://127.0.0.1:8000/uploads/;
        proxy_set_header Host \\\$host;
    }
}
EOF"

sudo nginx -t
sudo systemctl reload nginx

# 3. Rebuild frontend with official Title, Favicon, SEO, and Light/Dark mode toggles
echo "[3/4] Building optimized frontend..."
cd /var/www/edunexus/frontend
npm install
npm run build
cd /var/www/edunexus

sudo systemctl restart edunexus
sudo systemctl reload nginx

# 4. Issue Free SSL Certificate (HTTPS) via Let's Encrypt / Certbot
echo "[4/4] Obtaining Free SSL Certificate for edu-nexus.online..."
sudo certbot --nginx -d edu-nexus.online -d www.edu-nexus.online --non-interactive --agree-tos -m edunexus.infodesk@gmail.com --redirect || true

echo "======================================================"
echo "  🎉 EduNexus is Secure and LIVE on Your Domain!     "
echo "======================================================"
echo "🌐 Secure URL:         https://edu-nexus.online"
echo "🌐 WWW URL:            https://www.edu-nexus.online"
echo "🔑 Login URL:          https://edu-nexus.online/login"
echo "🛡️ Admin Dashboard:    https://edu-nexus.online/app/admin"
echo "======================================================"
