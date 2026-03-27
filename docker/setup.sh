#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# SignalPulse AI — DigitalOcean Droplet Bootstrap Script
# Run as root on a fresh Ubuntu 22.04 droplet.
# Usage: bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Exit immediately on any error

# ── 1. System dependencies ────────────────────────────────────────────────────
echo ""
echo "▶ Installing Docker and Docker Compose..."
apt-get update -qq
apt-get install -y docker.io docker-compose curl

# Start Docker and enable on boot
systemctl start docker
systemctl enable docker

echo "✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
echo "✓ Docker Compose $(docker-compose --version | cut -d' ' -f3 | tr -d ',')"

# ── 2. Clone the repository ───────────────────────────────────────────────────
echo ""
echo "▶ Cloning SignalPulse AI repository..."

REPO_URL="REPO_URL="https://github.com/chasesinclair23/signalpulse.git"
INSTALL_DIR="/opt/signalpulse"

if [ -d "$INSTALL_DIR" ]; then
  echo "  Directory $INSTALL_DIR already exists — pulling latest..."
  git -C "$INSTALL_DIR" pull
else
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR/docker"

# ── 3. Environment file ───────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created docker/.env from template"
else
  echo "  docker/.env already exists — skipping copy"
fi

# ── 4. Prompt user to fill in secrets before proceeding ──────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ACTION REQUIRED — fill in your secrets before continuing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Edit the file now:"
echo "    nano $INSTALL_DIR/docker/.env"
echo ""
echo "  Values to fill in:"
echo "    N8N_BASIC_AUTH_PASSWORD  — choose a strong password"
echo "    N8N_HOST                 — this droplet's IP address"
echo "    WEBHOOK_URL              — http://<this_droplet_ip>:5678/"
echo "    OPENAI_API_KEY           — your OpenAI secret key (sk-...)"
echo "    SUPABASE_SERVICE_ROLE_KEY — from Supabase dashboard → Settings → API"
echo "    SERP_API_KEY             — from serpapi.com/dashboard"
echo ""
echo "  SUPABASE_URL is pre-filled: https://qolusthqrhcontdvfvyx.supabase.co"
echo ""

read -rp "Press ENTER when you have saved docker/.env to continue..." _confirm

# ── 5. Start n8n ──────────────────────────────────────────────────────────────
echo ""
echo "▶ Starting n8n via Docker Compose..."
docker-compose -f "$INSTALL_DIR/docker/docker-compose.yml" --env-file "$INSTALL_DIR/docker/.env" up -d

# ── 6. Health check ───────────────────────────────────────────────────────────
echo ""
echo "▶ Waiting for n8n to become healthy..."
sleep 8

DROPLET_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
N8N_URL="http://${DROPLET_IP}:5678"

if curl -s -o /dev/null -w "%{http_code}" "${N8N_URL}/healthz" | grep -q "200"; then
  echo "✓ n8n is responding"
else
  echo "  n8n may still be starting — check with: docker logs signalpulse-n8n"
fi

# ── 7. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ SignalPulse AI — n8n is running"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  n8n URL:  ${N8N_URL}"
echo "  Username: admin  (or whatever you set in N8N_BASIC_AUTH_USER)"
echo "  Password: the value you set in N8N_BASIC_AUTH_PASSWORD"
echo ""
echo "  Next steps:"
echo "    1. Log in at ${N8N_URL}"
echo "    2. Import n8n/signalpulse_daily.json      (Settings → Import)"
echo "    3. Import n8n/signalpulse_snapshots.json"
echo "    4. Activate both workflows"
echo "    5. Run the daily workflow manually once to confirm end-to-end"
echo ""
echo "  Useful commands:"
echo "    docker logs -f signalpulse-n8n          # live logs"
echo "    docker-compose -f docker/docker-compose.yml restart   # restart"
echo ""
