#!/usr/bin/env bash
# ==============================================================================
# EduNexus — 1-Click AWS EC2 Automated Production Setup Script
# Designed for Ubuntu 22.04 LTS on AWS Free Tier (t2.micro / t3.micro)
# ==============================================================================

set -e

echo "======================================================"
echo "  🚀 Starting EduNexus Automated Setup on AWS EC2     "
echo "======================================================"

# 1. Update system packages
echo "[1/8] Updating Ubuntu system packages..."
sudo apt update -y && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv git nginx mysql-server certbot python3-certbot-nginx curl ufw fail2ban

# 2. Install Node.js 20 LTS
echo "[2/8] Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 3. Setup MySQL Database
echo "[3/8] Configuring MySQL Database..."
DB_PASS="EduNexusSecure2026@"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS edu_nexus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'edunexus_user'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "ALTER USER 'edunexus_user'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON edu_nexus.* TO 'edunexus_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 4. Project Directory Check
REPO_DIR="/var/www/edunexus"
if [ ! -d "$REPO_DIR" ]; then
    echo "[4/8] Creating directory and cloning repository..."
    sudo mkdir -p "$REPO_DIR"
    sudo chown -R $USER:$USER "$REPO_DIR"
    git clone https://github.com/pratapmerchandise-design/edu-nexus.git "$REPO_DIR"
fi

cd "$REPO_DIR"

# 5. Backend Virtual Environment & Dependencies
echo "[5/8] Setting up Python backend virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# Create production backend/.env if not present
SECRET_KEY_GEN=$(python3 -c "import secrets; print(secrets.token_hex(32))")
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || echo "localhost")

cat <<EOF > backend/.env
# Production Database Configuration
DATABASE_URL=mysql+pymysql://edunexus_user:${DB_PASS}@localhost:3306/edu_nexus

# Security Key
SECRET_KEY=${SECRET_KEY_GEN}

# Platform Administrator Initial Credentials
ADMIN_INITIAL_PASSWORD=SarthakVermaEdu12@

# Official Project Email Desk
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=edunexus.infodesk@gmail.com
EMAIL_PASSWORD=
EMAIL_FROM=EduNexus <edunexus.infodesk@gmail.com>

# Frontend Public URL
FRONTEND_BASE=http://${PUBLIC_IP}
EOF

# Initialize Database Schema & Admin Account
python3 -c "from backend.app.database import engine, Base; from backend.app.models import *; Base.metadata.create_all(bind=engine); print('[DB] Schema initialized.')"
python3 -c "from backend.app.main import startup_event; startup_event(); print('[Admin] Verified credentials.')"

# 6. Build Frontend
echo "[6/8] Building Frontend React application..."
cd "$REPO_DIR/frontend"
npm install
npm run build
cd "$REPO_DIR"

# 7. Create and Start Systemd Background Service
echo "[7/8] Configuring Systemd 24/7 background service..."
sudo bash -c "cat <<EOF > /etc/systemd/system/edunexus.service
[Unit]
Description=EduNexus FastAPI Backend
After=network.target mysql.service

[Service]
User=$USER
WorkingDirectory=$REPO_DIR
ExecStart=$REPO_DIR/venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5
EnvironmentFile=$REPO_DIR/backend/.env

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable edunexus
sudo systemctl restart edunexus

# 8. Configure Nginx Web Server & Reverse Proxy
echo "[8/8] Configuring Nginx web server and reverse proxy..."
sudo bash -c "cat <<EOF > /etc/nginx/sites-available/edunexus
server {
    listen 80;
    server_name ${PUBLIC_IP} _;

    client_max_body_size 50M;

    # 1. Frontend SPA
    root $REPO_DIR/frontend/dist;
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

sudo ln -sf /etc/nginx/sites-available/edunexus /etc/nginx/sites-enabled/edunexus
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Configure Firewall (UFW + Oracle Cloud iptables compatibility)
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
echo "y" | sudo ufw enable || true

# Oracle Cloud Ubuntu includes default iptables reject rules that need explicit ports:
if command -v iptables &> /dev/null; then
    sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT || true
    sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT || true
    if command -v netfilter-persistent &> /dev/null; then
        sudo netfilter-persistent save || true
    fi
fi

echo "======================================================"
echo "  🎉 EduNexus is LIVE on AWS EC2!                     "
echo "======================================================"
echo "🌐 Website URL:        http://${PUBLIC_IP}"
echo "🔑 Login URL:          http://${PUBLIC_IP}/login"
echo "🛡️ Admin Dashboard:    http://${PUBLIC_IP}/app/admin"
echo ""
echo "👤 Admin Credentials:"
echo "   Username:          admin"
echo "   Email:             edunexus.infodesk@gmail.com"
echo "   Password:          SarthakVermaEdu12@"
echo "======================================================"
