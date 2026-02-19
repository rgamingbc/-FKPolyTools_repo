# DEBUG / HISTORY / ASK（Backend vs Frontend）— 只用 15M / 15M2（唔好再用 CryptoAll 推論）

呢份文檔係針對：
- 15M Crypto：`http://localhost:5173/crypto-15m`
- 15M Crypto 2：`http://localhost:5173/crypto-15m-2`

目的：當 UI 顯示 rows=0、no-asks、history 空，但你懷疑 backend 其實有/冇資料時，用一套固定流程快速釘死「backend 問題」定「frontend render/state 問題」。

## 核心規則（永遠唔好再錯）
- **Debug 15M / 15M2 時，唔可以用 CryptoAll / CryptoAll2 嘅 setting/state 去推論**：CryptoAll 有 multi-TF、獨立 snapshot loop，同 crypto15m2 行為唔同，會造成錯誤結論。
- **先驗 backend JSON，再驗 UI**：backend 回傳係真相；UI 可能被去重、key、filter、WS/port 影響而「睇落似冇」。

---

## 1) Backend 應該點驗證（唔好靠 UI 猜）

Vite 會 proxy `/api` 去 API port（預設 3001），以下 endpoint 都可以直接用 browser 開或 curl。

### A. Status（先睇 config 係咪你以為嗰套）
- crypto15m：`/api/group-arb/crypto15m/status`
- crypto15m2：`/api/group-arb/crypto15m2/status`

你要睇嘅重點：
- `status.enabled / dryRun`
- `status.config`：
  - 15M：`expiresWithinSec`
  - 15M2：`expiresWithinSec` + `expiresWithinSecByTimeframe`（`5m/15m`）
- `status.lastError`：如有，代表 loop/下單/抓資料有實際錯誤

### B. Candidates（釘死 rows=0 / no-asks）
- crypto15m：`/api/group-arb/crypto15m/candidates?minProb=0.9&expiresWithinSec=180&limit=30`
- crypto15m2（可分 TF）：`/api/group-arb/crypto15m2/candidates?timeframes=5m,15m&minProb=0.9&expiresWithinSec=180&limit=30`

你要睇嘅重點（每條 row）：
- `eligibleByExpiry / meetsMinProb`
- `reason`（例如 `no-asks`、`books_backoff`、`price`）
- `booksError / booksAttemptError`（有錯先處理 books/連線；唔好先改 UI）
- `chosenPrice` / `prices` / `asksCount`（如果全部 null/0，多數係 books 未對上 tokenIds）
- `snapshotAt / staleMs / booksStaleMs`（判斷係 stale 定係真冇資料）

### C. Diag（釘死 CLOB /books 連線 / throttling）
- crypto15m2：`/api/group-arb/crypto15m2/diag`

你要睇嘅重點：
- `booksGlobal.lastStatus / lastError / throttleBackoffMs / blockedUntilMs`
- 如果 `blockedUntilMs>now` 或 `throttleBackoffMs>0`，就屬於被節流/封鎖，UI 自然會出現 stale/no-asks

### D. History（backend 有冇落盤、落盤有冇壞）
- crypto15m：`/api/group-arb/crypto15m/history?refresh=true&intervalMs=1000&maxEntries=50`
- crypto15m2：`/api/group-arb/crypto15m2/history?refresh=true&intervalMs=1000&maxEntries=50`

你要睇嘅重點：
- `history.length` 應該 <= `maxEntries`
- `summary.count`（同 `history.length` 可能唔一樣，但唔應該明顯矛盾）
- `historyPersist.lastError`（有就先修復落盤/檔案）

---

## 2) Frontend 應該點睇（先分清：收唔收到 data vs 渲染唔到）

對應檔案：
- 前端頁：[Crypto15m.tsx](file:///Users/user/Documents/trae_projects/polymarket/static/FKPolyTools_Repo/web_front_src/src/pages/Crypto15m.tsx)
- 15M2 wrapper：[Crypto15m2.tsx](file:///Users/user/Documents/trae_projects/polymarket/static/FKPolyTools_Repo/web_front_src/src/pages/Crypto15m2.tsx)

### A. 如果 backend candidates 有 rows，但 UI rows=0
優先懷疑：
- Table `rowKey` 有 null/undefined/重複（尤其係 merge/filter 後）
- UI 有「signature 去重」導致 state 冇更新（但 WS/HTTP 其實有返資料）

### B. 唔好用每秒變動欄位做全表 signature
反例：
- `secondsToExpire` 每秒變 → 會迫 UI 全表 re-render，仲會令「去重」同「更新」判斷變得不可靠

正解：
- countdown 交畀 row component 自己 tick
- table state 更新只跟 price/eligibility/id 等業務字段

---

## 3) Bulk Expire（15M2）點驗證係咪真係生效

### A. 先睇 status config
- `/api/group-arb/crypto15m2/status` 應該見到：`config.expiresWithinSecByTimeframe = { "5m": ..., "15m": ... }`

### B. 再睇 candidates 行為
- 打：`/api/group-arb/crypto15m2/candidates?timeframes=5m,15m&minProb=0.0&expiresWithinSec=9999&limit=80`
- 期望：
  - 5m rows 用 `expiresWithinSecByTimeframe.5m` 判斷 `eligibleByExpiry`
  - 15m rows 用 `expiresWithinSecByTimeframe.15m` 判斷 `eligibleByExpiry`

---

## 4) 快速結論判斷（30 秒內）
- backend `candidates.length>0` 但 UI rows=0 ⇒ **frontend render/key/filter 去查**
- backend `reason=no-asks` + `booksAttemptError` 有值 ⇒ **先修 backend books/節流**
- backend `history.length>0` 但 UI history 空 ⇒ **前端 merge/filter 去查**

---

## 5) Redeem（Claim）注意事項（15M / 15M2）

### A. 手動 redeem（最可靠）
- 直接用 Dashboard：`/dashboard` → Claim / Redeem Now
- 對應 backend endpoints（不分策略）：\n  - `POST /api/group-arb/redeem-drain`\n  - `POST /api/group-arb/redeem-now`\n  - `GET /api/group-arb/redeem/in-flight`

### B. Auto-redeem（有前置條件）
- Auto-redeem 需要 relayer/簽名相關設定正常（否則會 lastError）：
  - 先打 `/api/group-arb/auto-redeem/status` 睇 `lastError`
- Auto-redeem 會做過濾（所以你可能「明明 redeemable 但唔會自動 claim」）：\n  - 只會揀「工具落過單」嘅 conditionId\n  - 而且會要求 position 內有 `proxyWallet`（builder/proxy wallet）先會 submit\n  - 所以唔好用 CryptoAll/All2 的表面結果去推論 15M2 的 claim 行為

---

## 6) 「Position Missing」常見原因（唔一定係 bug）
- Data API positions 有延遲：剛成交/剛建立 position，短時間內可能仲未出現 → refresh 幾次 `/crypto15m2/history?refresh=true` 再判斷
- Address 範圍唔同：history 係用 funder（必要時再補 signer）去拉 positions；如果實際持倉喺另一個地址（例如某種 proxy/safe），就會長期 missing
- 訂單未成交：history 有落單記錄，但 order 其實 failed/canceled/unfilled，positions 本身唔會有
