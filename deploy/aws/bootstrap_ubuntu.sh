#!/usr/bin/env bash
set -euo pipefail

PUBLIC_IP="${PUBLIC_IP:-}"
REPO_DIR="${REPO_DIR:-/opt/fktools/FKPolyTools_Repo}"
GIT_REMOTE_URL="${GIT_REMOTE_URL:-https://github.com/rgamingbc/-FKPolyTools_repo.git}"
GIT_REF="${GIT_REF:-fix/crypto15m2-autotrade-hedge-20260220}"
DATA_DIR="${DATA_DIR:-/var/lib/polymarket-tools}"
API_DIR="${API_DIR:-$REPO_DIR/api_src}"
WEB_DIR="${WEB_DIR:-$REPO_DIR/web_front_src}"
API_PORT="${API_PORT:-3001}"
API_HOST="${API_HOST:-127.0.0.1}"
NODE_MAJOR="${NODE_MAJOR:-20}"

if [[ "$(id -u)" -eq 0 ]]; then
  :
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo not found. Please install sudo or run as root."
    exit 1
  fi
fi

run_sudo() {
  if [[ "$(id -u)" -eq 0 ]]; then
    bash -lc "$*"
  else
    sudo bash -lc "$*"
  fi
}

run_sudo "apt update -y"
run_sudo "apt install -y nginx git curl build-essential ca-certificates"

if ! command -v node >/dev/null 2>&1; then
  run_sudo "curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -"
  run_sudo "apt install -y nodejs"
fi

node -v
npm -v

run_sudo "mkdir -p /opt/fktools"
run_sudo "chown -R ubuntu:ubuntu /opt/fktools || true"
run_sudo "mkdir -p \"$DATA_DIR\""
run_sudo "chown -R ubuntu:ubuntu \"$DATA_DIR\" || true"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "Cloning repo to $REPO_DIR"
  run_sudo "rm -rf \"$REPO_DIR\" || true"
  run_sudo "git clone \"$GIT_REMOTE_URL\" \"$REPO_DIR\""
fi

cd "$REPO_DIR"
echo "Git: $(git log -1 --oneline 2>/dev/null || true)"
git fetch --all --prune || true
if git show-ref --verify --quiet "refs/remotes/origin/$GIT_REF"; then
  git checkout -B "$GIT_REF" "origin/$GIT_REF"
else
  git checkout "$GIT_REF"
fi
git pull --ff-only || true
echo "Git (after): $(git log -1 --oneline 2>/dev/null || true)"

if [[ ! -f "$API_DIR/package.json" ]]; then
  echo "API directory not found at $API_DIR"
  exit 3
fi

if [[ ! -f "$WEB_DIR/package.json" ]]; then
  echo "Web directory not found at $WEB_DIR"
  exit 4
fi

cd "$API_DIR"
npm ci
npm run build

if [[ ! -f "$API_DIR/.env" ]]; then
  cat >"$API_DIR/.env" <<EOF
API_PORT=$API_PORT
API_HOST=$API_HOST
POLY_ORDER_HISTORY_PATH=$DATA_DIR/history.json
POLY_AUTO_REDEEM_CONFIG_PATH=$DATA_DIR/auto-redeem.json
POLY_CRYPTO15M_DELTA_THRESHOLDS_PATH=$DATA_DIR/crypto15m-delta-thresholds.json
POLY_RELAYER_CONFIG_PATH=$DATA_DIR/relayer.json
EOF
  chmod 600 "$API_DIR/.env" || true
fi

cd "$WEB_DIR"
npm ci
npm run build

run_sudo "cat >/etc/systemd/system/fktools-api.service <<'EOF'
[Unit]
Description=FKPolyTools API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$API_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF"

run_sudo "cat >/etc/nginx/sites-available/fktools <<'EOF'
server {
  listen 80;
  server_name _;

  root $WEB_DIR/dist;
  index index.html;

  location ~ ^/api/group-arb/.*/ws$ {
    proxy_pass http://127.0.0.1:$API_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \"upgrade\";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:$API_PORT/api/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_read_timeout 180s;
    proxy_send_timeout 180s;
  }

  location = /index.html {
    try_files /index.html =404;
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF"

run_sudo "rm -f /etc/nginx/sites-enabled/default || true"
run_sudo "ln -sf /etc/nginx/sites-available/fktools /etc/nginx/sites-enabled/fktools"
run_sudo "nginx -t"
run_sudo "systemctl daemon-reload"
run_sudo "systemctl enable --now fktools-api"
run_sudo "systemctl reload nginx"

echo "OK"
echo "API local:  http://127.0.0.1:$API_PORT/api/"
if [[ -n "$PUBLIC_IP" ]]; then
  echo "Web public: http://$PUBLIC_IP/"
  echo "Diag:       http://$PUBLIC_IP/api/group-arb/crypto15m/diag"
else
  echo "Set PUBLIC_IP env var to print public URLs."
fi
