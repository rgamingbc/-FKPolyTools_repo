# Backup & Reinstall Plan (File-based)

## Repo / Host / Branch

- Host (origin): https://github.com/rgamingbc/polymarket-arbitrage-trading-tool.git
- Main branch: main
- Deployment recommendation: deploy by release tag (vYYYYMMDD-HHMM)

## What Should Be Backed Up

### 1) Code

- This repo working tree (recommended: clone fresh from origin + checkout your target tag).

### 2) Runtime config files (important)

These are local files created by the backend at runtime:

- Recommended persistent directory (cloud): /var/lib/polymarket-tools
- Relayer config: /var/lib/polymarket-tools/relayer.json
- Auto-redeem config: /var/lib/polymarket-tools/auto-redeem.json
- History file: /var/lib/polymarket-tools/history.json and history.json.bak
- PnL snapshots: /var/lib/polymarket-tools/pnl-snapshots.json

Recommendation: keep runtime files in a persistent directory so your config survives restarts.

### 3) Secrets (do NOT commit to git)

- Private key for Polymarket (env only).
- Relayer API keys / secrets / passphrases (stored in relayer.json locally; keep encrypted/secure).

### 4) UI fork reminder

Your UI fork repo can be used instead of the built-in UI folder:

- Current integrated UI path: `web_front_src/`
- If you want to use your own UI fork:
  - Clone your fork separately
  - Point its API baseURL to the backend URL
  - Keep route compatibility with `/api/group-arb/*`

## Backup Procedure (Recommended)

### A) Backup code (Git)

On your local machine:

    git clone https://github.com/rgamingbc/polymarket-arbitrage-trading-tool.git
    cd polymarket-arbitrage-trading-tool
    git fetch --all --tags
    git checkout vYYYYMMDD-HHMM

### B) Backup runtime files (tar.gz, cloud -> local)

On EC2:

    TS=$(date +%Y%m%d-%H%M%S)
    sudo mkdir -p /var/backups/fktools
    sudo tar -czf /var/backups/fktools/fktools-$TS.tar.gz /var/lib/polymarket-tools /etc/nginx/sites-available/fktools /etc/systemd/system/fktools-api.service
    sudo ls -lah /var/backups/fktools/fktools-$TS.tar.gz

On your local machine:

    mkdir -p ~/fktools_backups
    scp -i ~/Downloads/fktools-key.pem ubuntu@56.68.6.71:/var/backups/fktools/fktools-YYYYMMDD-HHMMSS.tar.gz ~/fktools_backups/

## Reinstall / Restore Procedure

### Backend (FKPolyTools_Repo/api_src)

1) Install deps

    cd FKPolyTools_Repo/api_src
    npm ci

2) Restore env vars (recommended)

Set Polymarket private key in env (never in repo).

3) Restore runtime files

Copy /var/lib/polymarket-tools from your backup tar.gz.

4) Run backend

    npm run build
    npm run dev

### Frontend (FKPolyTools_Repo/web_front_src)

1) Install deps

    cd FKPolyTools_Repo/web_front_src
    npm ci

2) Run UI

    npm run dev

3) Verify UI pages
   - `/crypto-15m`
   - `/advanced` (history view)

## Smoke Test Checklist

- Relayer status shows `relayerConfigured=true` and keys loaded
- `GET /api/group-arb/crypto15m/candidates` returns BTC/ETH/SOL rows
- `POST /api/group-arb/crypto15m/order` rejects when price < 0.90 (unless forced)
- `POST /api/group-arb/redeem/conditions` does not hang when redeemable=false (skips)
