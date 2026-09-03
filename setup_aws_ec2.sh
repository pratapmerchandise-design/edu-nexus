#!/usr/bin/env bash
# ==============================================================================
# EduNexus — 1-Click AWS EC2 Automated Production Setup Script
# Fast, non-interactive. Uses SQLite (no MySQL install needed).
# ==============================================================================

set -e

echo "======================================================"
echo "  🚀 Starting EduNexus Automated Setup on AWS EC2     "
echo "======================================================"

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a
sudo sed -i 's/#$nrconf{restart} = .*/$nrconf{restart} = "a";/g' /etc/needrestart/needrestart.conf 2>/dev/null || true

# 1. Install essential packages only (NO mysql-server — avoids 5-min hang)
echo "[1/7] Installing Nginx, Python, Git, Certbot, Node.js..."
sudo apt update -y
sudo DEBIAN_FRONTEND=noninteractive apt install -y \
    python3-pip python3-venv git nginx certbot python3-certbot-nginx curl

# Node.js 20
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null
    sudo DEBIAN_FRONTEND=noninteractive apt install -y nodejs
fi
echo "✅ Node $(node -v), Python $(python3 --version) installed."

# 2. Clone or pull repository
REPO_DIR="/var/www/edunexus"
echo "[2/7] Setting up project directory..."
if [ ! -d "$REPO_DIR/.git" ]; then
    sudo mkdir -p "$REPO_DIR"
    sudo chown -R $USER:$USER "$REPO_DIR"
    git clone https://github.com/pratapmerchandise-design/edu-nexus.git "$REPO_DIR"
else
    sudo chown -R $USER:$USER "$REPO_DIR"
    cd "$REPO_DIR"
    git fetch origin main
    git reset --hard origin/main
fi
cd "$REPO_DIR"

# 3. Python Virtual Environment
echo "[3/7] Setting up Python backend..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip -q
pip install -r backend/requirements.txt -q
pip install "email-validator>=2.1.0" -q

# Create backend/.env using SQLite (fast, zero setup)
SECRET_KEY_GEN=$(python3 -c "import secrets; print(secrets.token_hex(32))")
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo "localhost")

cat <<EOF > backend/.env
# Production Database (SQLite - fast and reliable)
DATABASE_URL=sqlite:///./edunexus.db

# Security Key
JWT_SECRET_KEY=${SECRET_KEY_GEN}
SECRET_KEY=${SECRET_KEY_GEN}

# Platform Administrator Initial Credentials
ADMIN_INITIAL_PASSWORD=SarthakVermaEdu12@

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=edunexus.infodesk@gmail.com
EMAIL_PASSWORD=
EMAIL_FROM=EduNexus <edunexus.infodesk@gmail.com>

# Frontend Public URL
FRONTEND_BASE=https://edu-nexus.online
EOF

echo "✅ Backend configured with SQLite."

# Initialize Database & Admin
python3 -c "
from backend.app.database import engine, Base
from backend.app.models import *
Base.metadata.create_all(bind=engine)
print('[DB] SQLite schema initialized.')
"

# 4. Build Frontend
echo "[4/7] Building Frontend (Favicon, Title, SEO, Light/Dark mode)..."
cd "$REPO_DIR/frontend"
npm install --silent 2>/dev/null || npm install
npx vite build
cd "$REPO_DIR"
echo "✅ Frontend built successfully."

# 5. Systemd service
echo "[5/7] Configuring 24/7 background service..."
cat <<EOF | sudo tee /etc/systemd/system/edunexus.service > /dev/null
[Unit]
Description=EduNexus FastAPI Backend
After=network.target

[Service]
User=$USER
WorkingDirectory=$REPO_DIR
ExecStart=$REPO_DIR/venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5
EnvironmentFile=$REPO_DIR/backend/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable edunexus
sudo systemctl restart edunexus
echo "✅ Backend service started."

# 6. Configure Nginx
echo "[6/7] Configuring Nginx reverse proxy..."
cat <<'NGINXEOF' | sudo tee /etc/nginx/sites-available/edunexus > /dev/null
server {
    listen 80;
    server_name edu-nexus.online www.edu-nexus.online _;

    client_max_body_size 50M;

    root /var/www/edunexus/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8000/uploads/;
        proxy_set_header Host $host;
    }
}
NGINXEOF

sudo ln -sf /etc/nginx/sites-available/edunexus /etc/nginx/sites-enabled/edunexus
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
echo "✅ Nginx configured."

# Disable internal firewall (AWS Security Groups handle this)
sudo ufw disable 2>/dev/null || true

# 7. Free SSL Certificate (HTTPS)
echo "[7/7] Activating Free HTTPS/SSL certificate..."
sudo certbot --nginx \
    -d edu-nexus.online \
    -d www.edu-nexus.online \
    --non-interactive \
    --agree-tos \
    -m edunexus.infodesk@gmail.com \
    --redirect 2>/dev/null || echo "(SSL will activate once DNS points to this IP)"

echo "======================================================"
echo "  🎉 EduNexus is LIVE and SECURED!                   "
echo "======================================================"
echo "🌐 Domain:    https://edu-nexus.online"
echo "🌐 WWW:       https://www.edu-nexus.online"
echo "🌐 Direct IP: http://${PUBLIC_IP}"
echo ""
echo "👤 Admin Login:"
echo "   Email:    edunexus.infodesk@gmail.com"
echo "   Password: SarthakVermaEdu12@"
echo "======================================================"
