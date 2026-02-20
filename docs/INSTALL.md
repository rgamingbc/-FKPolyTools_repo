# Local Install (FKPolyTools)

## 目標

- 後端（Fastify / TS）：`FKPolyTools_Repo/api_src`
- 前端（Vite / React）：`FKPolyTools_Repo/web_front_src`
- 預設 Port：API = 3001、Web = 5173

## 常用頁面（本地）

- Dashboard：`http://localhost:5173/`
- 15M Crypto：`http://localhost:5173/crypto-15m`
- 15M Crypto 2：`http://localhost:5173/crypto-15m-2`
- Crypto All：`http://localhost:5173/crypto-all`
- Crypto All 2：`http://localhost:5173/crypto-all-2`

## 注意事項（重要）

- `.env` / 私鑰 / relayer keys 唔可以入 git，必須只留喺機器本地（或加密備份）。
- runtime 落盤檔案建議固定放喺同一個 persistent directory（雲端一般係 `/var/lib/polymarket-tools`）；換機/重裝要跟 [BACKUP-RESTORE.md](file:///Users/user/Documents/trae_projects/polymarket/static/FKPolyTools_Repo/docs/BACKUP-RESTORE.md) 還原。
- Auto-redeem（Claim）需要 relayer 正常；如自動 claim 冇反應，先睇 `/api/group-arb/auto-redeem/status` 嘅 `lastError`。
- History（落單/claim/stoploss 記錄）會落盤到 `.polymarket-tools/accounts/<accountId>/history.json`；建議唔好用 tmp 做 state dir，避免重啟後「似唔見記錄」。
- 如你開住 UI 不停調 config / start-stop watchdog，舊版會容易把 order 記錄「頂走」；新版已改為優先清 config/watchdog，保留 order/redeem，並預設保留更多（可用 `POLY_ORDER_HISTORY_MAX` 調整）。

## 從 Git 取得 / 更新

### 更新（既有機器）

```bash
git pull --ff-only
```

如你係喺外層 repo 操作（而 `FKPolyTools_Repo` 係獨立 repo / 類 submodule），要另外更新一次：

```bash
cd FKPolyTools_Repo
git pull --ff-only
```

如果你用 submodule 管理：

```bash
git submodule update --init --recursive
```

## 後端：api_src

```bash
cd FKPolyTools_Repo/api_src
cp .env.example .env
npm ci
npm run dev
```

如需要交易（下單/平倉/auto），必須提供 `POLY_PRIVKEY`（0x 開頭私鑰）。

## 前端：web_front_src

```bash
cd FKPolyTools_Repo/web_front_src
cp .env.example .env
npm ci
npm run dev
```

## 常見痛點（一定要避）

### 1) Port/WS 不一致（WS OFF、Candidates 唔更新）

- API 預設係 `API_PORT=3001`
- 前端 proxy 會用 `VITE_API_PORT`（預設亦係 3001）
- 如果你改過 API port，記得同時改前端 `.env` 入面嘅 `VITE_API_PORT`

### 1.5) 前端見到 404 / AutoTrade / Watchdog 唔 work（其實係 API 唔通）

- 先驗收後端係咪真係起咗（必做）：`curl -sS http://localhost:3001/api/version | head`
- 再驗收前端 proxy 是否正常：`curl -sS http://localhost:5173/api/group-arb/crypto15m/status | head`
- 只要上述任何一條唔通，UI 上面所有 `/api/...` 都會壞（表面就會似 404 / 無反應）。

### 2) API/Trading 授權狀態卡住

- 交易需要 `POLY_PRIVKEY`（API Key/UUID 唔足夠用嚟簽交易）
- 設定私鑰後，Trading client 初始化失敗會自動重試（有 backoff），UI 會顯示 `Key/Trading/Creds/InitError`

### 3) 本地完全打唔開（Dashboard/CryptoAll/All2 全部入唔到）

- 先確認 Web 係咪真係起咗（預設 `http://localhost:5173/`）
- 如果 `localhost:5173` 連唔到：
  - 多數係未有喺 `FKPolyTools_Repo/web_front_src` 起 Web
  - 或者 5173 被佔用，Vite 會自動轉用 5174/5175（要睇啟動 log 顯示嘅 URL）
- 如果你其實係喺另一部機/VM/容器起 server：
  - `localhost` 只會指向你本機，必然打唔開
  - 建議用 SSH port-forward，或者 Vite 用 `--host 0.0.0.0` 再用 `http://<機器IP>:5173/` 開

## 驗收

- 前端：打開 `http://localhost:5173`
- 後端：

```bash
curl -sS http://localhost:3001/api/group-arb/setup/status | head
curl -sS http://localhost:3001/api/group-arb/crypto15m/status | head
curl -sS http://localhost:3001/api/group-arb/crypto15m2/status | head
curl -sS http://localhost:3001/api/group-arb/crypto15m2/diag | head
curl -sS http://localhost:3001/api/group-arb/cryptoall/status | head
curl -sS http://localhost:3001/api/group-arb/cryptoall2/status | head
```

## CryptoAll vs CryptoAll2（獨立運作）

- 兩者策略邏輯對齊，但 Config/State 係分開，方便做「進取 vs 保守」對照
- 預設落盤檔案（可用 env 覆蓋）：
  - CryptoAll：`crypto_all_v2.json`
  - CryptoAll2：`crypto_all_2.json`
