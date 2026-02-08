# AWS EC2 部署（FKPolyTools）

## 架構建議（最穩陣）

- EC2 跑 API（Fastify / Node）只聽 `127.0.0.1:3001`
- Nginx 對外提供 `80/443`：
  - `/api/*` 反向代理到 `http://127.0.0.1:3001`
  - `/` serve `FKPolyTools_Repo/web_front_src/dist`（Vite build）
- 安全組（Security Group）只開：`80`、`443`（同埋你自己 SSH 管理用 `22`）

## 0) 準備一部 EC2

- 推薦：Ubuntu 22.04 LTS
- Instance：t3.small 或以上（建議最少 2GB RAM）
- Storage：20GB+
- Security Group：Inbound 開 `22`（你 IP）、`80`、`443`

## 1) 安裝依賴（Node / Git / Nginx）

```bash
sudo apt update
sudo apt install -y git nginx ca-certificates curl
```

安裝 Node.js（建議 Node 20 LTS）：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 2) 拉 code（建議用 Git）

```bash
cd ~
git clone <你的 repo URL>
cd FKPolyTools_Repo
git pull --ff-only
```

如果你係用「外層 repo + 內層 FKPolyTools_Repo」：

```bash
cd <外層 repo root>
git pull --ff-only
git submodule update --init --recursive || true
cd FKPolyTools_Repo
git pull --ff-only
```

## 3) 設定環境變數（最重要）

### API `.env`

```bash
cd ~/FKPolyTools_Repo/api_src
cp .env.example .env
```

- 交易/落單要用 `POLY_PRIVKEY`（EOA 私鑰）  
- 唔好將 `.env` 入 git、唔好貼私鑰/secret 到 chat 或 log

建議做法：用 AWS SSM Parameter Store / Secrets Manager 放 secrets，啟動 service 時再注入環境變數。

## 4) Build（SDK + API + Web）

SDK：

```bash
cd ~/FKPolyTools_Repo
npm ci
npm run build
```

API：

```bash
cd ~/FKPolyTools_Repo/api_src
npm ci
npm run build
```

Web：

```bash
cd ~/FKPolyTools_Repo/web_front_src
npm ci
npm run build
```

## 5) 用 systemd 長跑 API（推薦）

建立 service 檔：

```bash
sudo tee /etc/systemd/system/fkpolytools-api.service > /dev/null <<'EOF'
[Unit]
Description=FKPolyTools API (Fastify)
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/ubuntu/FKPolyTools_Repo/api_src
Environment=NODE_ENV=production
Environment=API_PORT=3001
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF
```

啟動：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now fkpolytools-api
sudo systemctl status fkpolytools-api --no-pager
```

Log：

```bash
journalctl -u fkpolytools-api -n 200 --no-pager
```

## 6) 設定 Nginx（serve web + proxy /api）

把 web build output 連到 Nginx：

```bash
sudo mkdir -p /var/www/fkpolytools
sudo rsync -a --delete ~/FKPolyTools_Repo/web_front_src/dist/ /var/www/fkpolytools/
```

建立 Nginx site：

```bash
sudo tee /etc/nginx/sites-available/fkpolytools > /dev/null <<'EOF'
server {
  listen 80;
  server_name _;

  root /var/www/fkpolytools;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
EOF
```

啟用並 reload：

```bash
sudo ln -sf /etc/nginx/sites-available/fkpolytools /etc/nginx/sites-enabled/fkpolytools
sudo nginx -t
sudo systemctl reload nginx
```

## 7) 驗收（EC2 上跑）

```bash
curl -sS http://127.0.0.1:3001/api/group-arb/setup/status | head
curl -sS http://127.0.0.1:3001/api/group-arb/crypto15m/status | head
```

Browser 打開：
- `http://<EC2 Public IP>/`

## 8) HTTPS（可選）

用 Let’s Encrypt：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx
```

## 常見坑

- `localhost` 只係本機：你喺自己電腦打 `localhost:5173` 係唔會去到 EC2
- Vite dev server 唔建議放 production：用 `vite build` + Nginx serve `dist`
- API 一定要用 process manager（systemd/pm2），唔好用 SSH 開 terminal 長跑
