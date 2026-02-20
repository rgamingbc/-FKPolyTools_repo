# Install + Update（FKPolyTools）

呢份文件係「唯一入口」。目標係：任何人跟住做，都能夠裝到**同一個版本**，並且 UI 一定見到 `⏱️ 15M Crypto 2`（`/crypto-15m-2`）。

## 你應該見到咩（版本驗收）

打開 Web 後，Sidebar 必須見到：

- `⏱️ 15M Crypto`（`/crypto-15m`）
- `⏱️ 15M Crypto 2`（`/crypto-15m-2`）
- `🪤 Crypto15M Hedge`（`/crypto-15m-hedge`）
- `🧩 Crypto All2`（`/crypto-all2`）

兼容舊連結（唔係停用，只係 redirect）：

- `/crypto-15m-all` → `/crypto-15m`
- `/crypto-all` → `/crypto-all2`

Crypto All2 內包含 Matrix/DeltaBox（策略視圖 + delta thresholds 操作），如果你裝好但 UI 完全冇呢啲入口，基本上就係裝到舊版本。

## 最重要：一定要用正確 Repo / Branch

你要 clone/更新嘅 repo 應該係：

- `https://github.com/rgamingbc/-FKPolyTools_repo.git`

本次修正（包含 Crypto15m2/AutoTrade/Hedge 等）係喺 branch：

- `fix/crypto15m2-autotrade-hedge-20260220`

用以下命令確認你部機係咪真係跟緊正確 repo + branch：

```bash
git remote -v
git branch --show-current
git log -1 --oneline
```

如果你 remote/branch 唔對，UI 好大機會仍然係舊版本（例如只見到 Crypto 15M / Crypto All，而冇 Crypto 15M 2）。

## 安全注意事項（一定要讀）

- `.env` / 私鑰 / relayer keys 唔可以入 git，必須只留喺機器本地（或加密備份）。
- runtime state 建議固定放喺同一個 persistent directory（雲端一般係 `/var/lib/polymarket-tools`）；換機/重裝要跟 [BACKUP-RESTORE.md](file:///Users/user/Documents/trae_projects/polymarket/static/FKPolyTools_Repo/docs/BACKUP-RESTORE.md) 還原。
- 如需要交易（下單/平倉/auto），必須提供 `POLY_PRIVKEY`（0x 開頭私鑰），並且只放入機器本地 `.env`。

## Ubuntu 伺服器（一鍵安裝 / 一鍵更新）

以下腳本可以重複跑：\n- 第一次跑＝安裝\n- 之後跑＝更新（會 git fetch/checkout/pull、重新 build、重啟 service）

```bash
set -euo pipefail

REMOTE_URL="https://github.com/rgamingbc/-FKPolyTools_repo.git"
GIT_REF="fix/crypto15m2-autotrade-hedge-20260220"

INSTALL_PARENT="/opt/fktools"
REPO_DIR="$INSTALL_PARENT/FKPolyTools_Repo"
DATA_DIR="/var/lib/polymarket-tools"

API_PORT="3001"
API_HOST="127.0.0.1"
NODE_MAJOR="20"

sudo apt update -y
sudo apt install -y nginx git curl build-essential ca-certificates

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt install -y nodejs
fi

node -v
npm -v

sudo mkdir -p "$INSTALL_PARENT"
sudo chown -R "$(whoami)":"$(whoami)" "$INSTALL_PARENT" || true
sudo mkdir -p "$DATA_DIR"
sudo chown -R "$(whoami)":"$(whoami)" "$DATA_DIR" || true

if [ ! -d "$REPO_DIR/.git" ]; then
  git clone "$REMOTE_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
git fetch --all --prune
git checkout -B "$GIT_REF" "origin/$GIT_REF" || git checkout "$GIT_REF"
git pull --ff-only || true
git log -1 --oneline

cd "$REPO_DIR/api_src"
npm ci
npm run build

if [ ! -f "$REPO_DIR/api_src/.env" ]; then
  cat >"$REPO_DIR/api_src/.env" <<EOF
API_PORT=$API_PORT
API_HOST=$API_HOST
POLY_ORDER_HISTORY_PATH=$DATA_DIR/history.json
POLY_AUTO_REDEEM_CONFIG_PATH=$DATA_DIR/auto-redeem.json
POLY_CRYPTO15M_DELTA_THRESHOLDS_PATH=$DATA_DIR/crypto15m-delta-thresholds.json
POLY_RELAYER_CONFIG_PATH=$DATA_DIR/relayer.json
# 如要交易：你必須手動加入（不要入 git）
# POLY_PRIVKEY=0x....
EOF
  chmod 600 "$REPO_DIR/api_src/.env" || true
fi

cd "$REPO_DIR/web_front_src"
npm ci
npm run build

sudo tee /etc/systemd/system/fktools-api.service >/dev/null <<EOF
[Unit]
Description=FKPolyTools API
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$REPO_DIR/api_src
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/nginx/sites-available/fktools >/dev/null <<EOF
server {
  listen 80;
  server_name _;

  root $REPO_DIR/web_front_src/dist;
  index index.html;

  location ~ ^/api/group-arb/.*/ws$ {
    proxy_pass http://127.0.0.1:$API_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
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

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default || true
sudo ln -sf /etc/nginx/sites-available/fktools /etc/nginx/sites-enabled/fktools
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable --now fktools-api
sudo systemctl reload nginx

echo "DONE"
echo "API: http://127.0.0.1:$API_PORT/api/"
```

## 本機開發（Local dev）

後端：

```bash
cd FKPolyTools_Repo/api_src
npm ci
npm run dev
```

前端：

```bash
cd FKPolyTools_Repo/web_front_src
npm ci
npm run dev
```

## 驗收（一定要做）

API：

```bash
curl -sS http://localhost:3001/api/version | head
curl -sS http://localhost:3001/api/group-arb/crypto15m/status | head
curl -sS http://localhost:3001/api/group-arb/crypto15m2/status | head
curl -sS http://localhost:3001/api/group-arb/crypto15m2/diag | head
curl -sS http://localhost:3001/api/group-arb/cryptoall2/status | head
```

UI：

- 打開 `http://localhost:5173/`（dev）或 `http://<server-ip>/`（nginx）\n- Sidebar 必須見到 `⏱️ 15M Crypto 2`

## 常見問題（點解你會「以為更新咗但其實仲係舊版」）

- Clone 錯 repo：用 `git remote -v` 檢查，一定要係 `rgamingbc/-FKPolyTools_repo`。\n- Checkout 錯 branch：用 `git branch --show-current`。\n- Server 用 nginx serve `dist`：你冇跑 `web_front_src/npm run build`，就會永遠見到舊 UI。\n- Browser cache：hard refresh（Cmd+Shift+R / Ctrl+F5）。\n- 你其實係開緊另一部舊 server：用 `curl http://<server-ip>/api/version` 對照版本。

## 本次更新做咗咩（俾「下家」一眼看明）

- Crypto15m2 / AutoTrade：修正 5m orderbook refresh、修正 expiresWithinSec override、修正 `/crypto15m2/order` 可能 500（JSON circular）。\n- Crypto15m Hedge：入場前做 p2Max 可行性檢查；入場後即刻嘗試 hedge；到期前未 hedge 會 unwind（封頂 one-leg 風險）。\n- Crypto All2：UI 內含 Matrix/DeltaBox（delta thresholds 管理/應用流程）。\n- 相容：舊 `crypto-all` / `crypto-15m-all` 路徑保留 redirect，避免舊 bookmark 壞。
