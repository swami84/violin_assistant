#!/bin/bash
# Violin Rhythm Trainer — redeploy after code changes
# Run as root: sudo bash deploy/update.sh
set -euo pipefail

GREEN='\033[0;32m'; NC='\033[0m'
info() { echo -e "${GREEN}▶ $*${NC}"; }

[[ $EUID -eq 0 ]] || { echo "Run with sudo"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_USER="${SUDO_USER:-$(logname)}"
STATIC_DIR="/var/www/violin_assistant"

info "Rebuilding frontend..."
cd "$PROJECT_DIR/frontend"
sudo -u "$DEPLOY_USER" npm install --silent
sudo -u "$DEPLOY_USER" npm run build
cp -r "$PROJECT_DIR/frontend/dist/." "$STATIC_DIR/"
chown -R www-data:www-data "$STATIC_DIR"

info "Updating backend dependencies..."
cd "$PROJECT_DIR/backend"
sudo -u "$DEPLOY_USER" venv/bin/pip install -q -r requirements.txt

info "Restarting backend service..."
systemctl restart violin-backend

info "Reloading nginx..."
nginx -t && systemctl reload nginx

LOCAL_IP=$(hostname -I | awk '{print $1}')
echo ""
echo -e "${GREEN}Updated. Live at https://$LOCAL_IP${NC}"
