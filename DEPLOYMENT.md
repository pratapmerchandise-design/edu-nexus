# EduNexus — Deployment Guide (Free Hosting)

This guide explains how to take EduNexus (React + Vite frontend, FastAPI + SQLAlchemy backend)
from your laptop to a **free, client-ready deployment** so you can hand it over without
needing to babysit servers.

---

## 1. Architecture recap

```
Browser (React SPA)
   |  REST  /api/*   +   WebSocket  /api/conversations/ws/*
   v
FastAPI backend  -->  Database (Postgres/MySQL/SQLite)  +  local /uploads (media)
```

- Frontend: static files (no server needed).
- Backend: Python/FastAPI. Talks to a SQL database and serves uploaded media.
- The frontend calls the backend through `VITE_API_BASE` (REST) and `VITE_WS_BASE` (realtime).

---

## 2. Recommended FREE stack

| Layer        | Free service                                  | Notes |
|--------------|-----------------------------------------------|-------|
| Frontend     | **Vercel** or **Netlify** (free tier)         | Drop the `frontend/dist` folder. Auto HTTPS. |
| Backend      | **Render** (free tier) or **Railway** free    | Runs `uvicorn`. 512 MB RAM is enough for MVP. |
| Database     | **Neon Postgres** free (0.5 GB) or **Supabase**| Managed Postgres; copy the connection string into `DATABASE_URL`. |
| Media (optional) | **Cloudinary** free / **Cloudflare R2** free | See "Media persistence" below. Local disk is fine for a demo but not for production. |

> The app auto-falls back to **SQLite** (`edu_nexus.db`) if `DATABASE_URL` is not set.
> For a real launch, **use Postgres** so data survives restarts.

---

## 3. Backend env (`backend/.env`)

```
# Database (Neon/Supabase example)
DATABASE_URL=postgresql+psycopg://user:pass@ep-xxxx.neon.tech/neondb

# Auth
JWT_SECRET_KEY=change-this-to-a-long-random-string

# SMTP (optional but recommended for email verification / password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=you@domain.com
EMAIL_PASSWORD=app-password
EMAIL_FROM=Edu Nexus <you@domain.com>

FRONTEND_BASE=https://your-frontend.vercel.app
```

Run backend locally / on host:
```bash
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```
On Render/Railway set the **Start command** to:
`uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`

---

## 4. Frontend env (project root, create `.env` for Vite)

```
# Point these at your deployed backend.
VITE_API_BASE=https://edunexus-backend.onrender.com/api
VITE_WS_BASE=wss://edunexus-backend.onrender.com
```

Build and ship:
```bash
npm install
npm run build          # outputs /dist
# Vercel/Netlify: build command = npm run build, output dir = dist
```

> If you serve the frontend from the **same domain** as the backend (e.g. backend
> serves the built `dist`), leave `VITE_API_BASE=/api` and `VITE_WS_BASE` unset.

---

## 5. CORS

`backend/app/main.py` currently allows all origins. For production, restrict it to your
frontend domain(s):
```python
origins = ["https://your-frontend.vercel.app"]
```
(Keep `allow_credentials=True` only with explicit origins, never with `"*"` + credentials.)

---

## 6. Media persistence

`backend/app/api/upload.py` stores files on the server's local disk
(`backend/uploads`). On free hosts this disk is **ephemeral** (reset on every deploy).
For a durable launch, upload to object storage instead:

- **Cloudinary** (free 25 GB) — return the hosted URL from `/api/upload`.
- **Cloudflare R2 / AWS S3** — same idea.

Minimal change: in `upload.py`, instead of writing to disk, upload the bytes to your
bucket and return the public URL. The rest of the app already stores/serves that URL.

---

## 7. First login

The backend seeds these accounts on first start (`backend/app/main.py`):
- **Admin:** `admin` / `admin123`
- **Demo student:** `aarav` / `password123`

Change the admin password immediately after launch.

---

## 8. Production hardening checklist (before going live)

- [ ] Strong, unique `JWT_SECRET_KEY` (and rotate it).
- [ ] Restrict CORS to real frontend origins.
- [ ] Use managed Postgres (not SQLite) with automated backups.
- [ ] Move media to object storage (Cloudinary/R2).
- [ ] Configure real SMTP + sender identity.
- [ ] Add rate limiting on auth + upload endpoints.
- [ ] Set JWT expiry + refresh tokens for long sessions.
- [ ] Enable HTTPS everywhere (Vercel/Render/Netlify do this automatically).
- [ ] Review the moderation queue (Admin page) workflow with the client.
- [ ] Add basic analytics/error monitoring (e.g. Sentry free tier).

---

## 9. AWS Production Deployment Architecture (Worldwide Scale)

For hosting EduNexus on AWS for production:

```
[Users Worldwide]
       │
       ▼
[AWS Route 53 (DNS)] + [AWS Certificate Manager (Free SSL)]
       │
       ├─────────────────────────────────────────┐
       ▼                                         ▼
[AWS CloudFront CDN]                      [Application Load Balancer / Nginx]
       │                                         │
       ▼                                         ▼
[S3 Bucket: Static Frontend]              [AWS EC2 / ECS Fargate: FastAPI Backend]
(React + Vite production bundle)          (Uvicorn ASGI + WebSockets)
                                                 │
                                                 ├──> [AWS RDS (MySQL / PostgreSQL)]
                                                 │    (Database with multi-AZ failover)
                                                 │
                                                 └──> [AWS S3: Media Uploads Bucket]
                                                      (Avatars, post images, attachments)
```

### A. Frontend (AWS S3 + CloudFront)
1. Build frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. Upload `frontend/dist/*` to an S3 bucket configured for static website hosting.
3. Attach CloudFront distribution pointing to S3:
   - Configure custom error responses: return `index.html` with status `200` for client-side routing.
   - Attach SSL certificate from AWS Certificate Manager (ACM).

### B. Backend (AWS Free Tier EC2 — t2.micro or t3.micro)
1. **EC2 Instance Specs**:
   - Ubuntu 22.04 LTS (x86_64 or ARM64)
   - Instance Type: `t2.micro` or `t3.micro` (750 hours/month FREE for 12 months)
   - Storage: 30 GB gp3 root volume (FREE tier eligible)

2. **Server Setup & Security Hardening**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y python3-pip python3-venv git nginx ufw fail2ban

   # Enable Linux firewall (UFW)
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

3. **Clone Project & Setup Python Virtual Environment**:
   ```bash
   sudo mkdir -p /var/www/edunexus
   sudo chown -R ubuntu:ubuntu /var/www/edunexus
   git clone <repo_url> /var/www/edunexus
   cd /var/www/edunexus
   python3 -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   ```

4. **Production `.env` Configuration (`/var/www/edunexus/backend/.env`)**:
   ```env
   # Database: Local MySQL on EC2 or AWS RDS db.t3.micro (Free Tier)
   DATABASE_URL=mysql+pymysql://root:StrongPassword@localhost:3306/edu_nexus
   
   # Cryptographic Session Secret
   SECRET_KEY=generate-a-64-character-hex-key-with-openssl-rand-hex-32
   
   # Official Project Email Desk
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=edunexus.infodesk@gmail.com
   EMAIL_PASSWORD=your-google-app-password-here
   EMAIL_FROM=EduNexus <edunexus.infodesk@gmail.com>
   
   # Production Frontend Domain
   FRONTEND_BASE=https://yourdomain.com
   ```

5. **Systemd Service (`/etc/systemd/system/edunexus.service`)**:
   *Note: Using `--workers 2` optimizes for 1 GB RAM on AWS Free Tier instances without crashing.*
   ```ini
   [Unit]
   Description=EduNexus FastAPI Backend
   After=network.target

   [Service]
   User=ubuntu
   WorkingDirectory=/var/www/edunexus
   ExecStart=/var/www/edunexus/venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --workers 2
   Restart=always
   RestartSec=5
   EnvironmentFile=/var/www/edunexus/backend/.env

   [Install]
   WantedBy=multi-user.target
   ```
   Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable edunexus
   sudo systemctl start edunexus
   ```

6. **Configure Nginx Reverse Proxy (`/etc/nginx/sites-available/edunexus`)**:
   ```nginx
   server {
       server_name api.yourdomain.com;

       client_max_body_size 25M;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Link and reload:
   ```bash
   sudo ln -s /etc/nginx/sites-available/edunexus /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

7. **Free Let's Encrypt SSL (HTTPS)**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

### C. Admin Access in Production
- **Admin Panel URL**: `/app/admin` (or Login at `/login`)
- **Admin Username**: `admin`
- **Admin Official Email**: `edunexus.infodesk@gmail.com`
- **Admin Secure Password**: `SarthakVermaEdu12@`

### D. Built-In Cybersecurity Protections
1. **HTTP Security Headers**: Every backend response enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
2. **Brute Force Rate Limiter**: Automatically throttles abusive credential stuffing attempts on `/auth/login` and `/auth/register` (max 20 attempts/min per IP with HTTP 429).
3. **Cryptographic Salted Passwords**: Uses salted bcrypt hashing with high work factor.
4. **SQL Injection Defense**: 100% of database access is strictly parameterized via SQLAlchemy ORM.
5. **No Demo Data**: Database starts completely clean with 0 test schools and 0 demo users.
