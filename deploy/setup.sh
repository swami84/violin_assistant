#!/bin/bash
# Violin Rhythm Trainer — production setup
# Run once as root: sudo bash deploy/setup.sh
set -euo pipefail

# ── colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}▶ $*${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $*${NC}"; }
abort() { echo -e "${RED}✖ $*${NC}"; exit 1; }

# ── must run as root ──────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || abort "Run with sudo: sudo bash deploy/setup.sh"

# ── paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_USER="${SUDO_USER:-$(logname)}"
STATIC_DIR="/var/www/violin_assistant"
CERT_DIR="/etc/nginx/certs/violin"
SERVICE_NAME="violin-backend"
LOCAL_IP=$(hostname -I | awk '{print $1}')

info "Project: $PROJECT_DIR"
info "Deploying as user: $DEPLOY_USER"
info "Server IP: $LOCAL_IP"
echo ""

# ── 1. system packages ────────────────────────────────────────────────────────
info "Installing system packages..."
apt-get update -qq
apt-get install -y nginx openssl apache2-utils python3 python3-venv python3-pip \
                   ffmpeg nodejs npm ufw curl

# ── 2. password ───────────────────────────────────────────────────────────────
info "Setting site password..."
echo ""
htpasswd -c /etc/nginx/.htpasswd violin
chmod 640  /etc/nginx/.htpasswd
chown root:www-data /etc/nginx/.htpasswd

# ── 3. TLS certificate (self-signed, valid 10 years) ─────────────────────────
info "Generating self-signed TLS certificate for $LOCAL_IP..."
mkdir -p "$CERT_DIR"
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$CERT_DIR/violin.key" \
  -out    "$CERT_DIR/violin.crt" \
  -subj   "/CN=violin-trainer/O=ViolinTrainer" \
  -addext "subjectAltName=IP:$LOCAL_IP,IP:127.0.0.1"
chmod 600 "$CERT_DIR/violin.key"
chmod 644 "$CERT_DIR/violin.crt"
info "Certificate: $CERT_DIR/violin.crt"

# ── 4. build frontend ─────────────────────────────────────────────────────────
info "Building frontend..."
cd "$PROJECT_DIR/frontend"
sudo -u "$DEPLOY_USER" npm install --silent
sudo -u "$DEPLOY_USER" npm run build

# ── 5. deploy static files ────────────────────────────────────────────────────
info "Deploying static files to $STATIC_DIR..."
mkdir -p "$STATIC_DIR"
cp -r "$PROJECT_DIR/frontend/dist/." "$STATIC_DIR/"
chown -R www-data:www-data "$STATIC_DIR"

# ── 6. nginx config ───────────────────────────────────────────────────────────
info "Configuring nginx..."
cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/violin-trainer
ln -sf /etc/nginx/sites-available/violin-trainer \
       /etc/nginx/sites-enabled/violin-trainer
# Disable default site so our config takes over port 80/443
rm -f /etc/nginx/sites-enabled/default
nginx -t || abort "nginx config invalid"
systemctl enable nginx
systemctl reload nginx

# ── 7. Python backend ─────────────────────────────────────────────────────────
info "Setting up Python backend..."
cd "$PROJECT_DIR/backend"
sudo -u "$DEPLOY_USER" python3 -m venv venv
sudo -u "$DEPLOY_USER" venv/bin/pip install -q -r requirements.txt

# ── 8. systemd service ────────────────────────────────────────────────────────
info "Installing systemd service..."
sed "s|__USER__|$DEPLOY_USER|g; s|__PROJECT_DIR__|$PROJECT_DIR|g" \
  "$SCRIPT_DIR/violin-backend.service" \
  > /etc/systemd/system/$SERVICE_NAME.service

systemctl daemon-reload
systemctl enable  $SERVICE_NAME
systemctl restart $SERVICE_NAME
sleep 2
systemctl is-active --quiet $SERVICE_NAME \
  && info "Backend service running" \
  || warn "Backend service may have failed — check: journalctl -u $SERVICE_NAME"

# ── 9. firewall ───────────────────────────────────────────────────────────────
info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh         # keep SSH open — do NOT skip this
ufw allow 80/tcp      # HTTP (redirects to HTTPS)
ufw allow 443/tcp     # HTTPS
# Port 8000 (FastAPI) is intentionally NOT opened — only nginx can reach it
ufw --force enable
info "Firewall active"

# ── done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Violin Trainer is live!${NC}"
echo -e "${GREEN}  URL : https://$LOCAL_IP${NC}"
echo -e "${GREEN}  User: violin${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
warn "Browser will show a certificate warning — this is expected for a"
warn "self-signed cert. Click 'Advanced → Proceed' to continue."
warn "The connection is still fully encrypted."
echo ""
info "To share with others on your network, give them: https://$LOCAL_IP"
info "To update the app after code changes, run: sudo bash deploy/update.sh"
