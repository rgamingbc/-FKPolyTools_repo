# DEBUG / HISTORY / ASK（Backend vs Frontend）永遠提醒（唔好再錯）

呢份文檔係針對 `http://localhost:5173/crypto-15m-all` 呢類頁面，長期避免重覆犯錯：UI 顯示 rows=0、no-asks、history 空，但 backend 其實有/冇資料。

## 一句講清楚（最常見成因）
- **UI rows=0 唔等於 backend 冇資料**：好多時係 React Table `rowKey` 撞 key / null key，或者前端用咗「signature 去重」導致 state 唔更新。
- **no-asks / 0.0c 唔等於 market 冇 ask**：優先懷疑係 **books snapshot 冇填到**（tokenCount=0）、或者 `/books` 回傳 tokenId key 解析錯（`token_id` vs `asset_id`），令 orderbook 對唔上 tokenId。
- **summary 有數但 history 空**：一定要分清係 backend 回傳就係咁，定係 frontend merge/filter/render 出事。

---

## 1) Backend 應該點驗證（唔好靠 UI 猜）

### History（15m / all）
用以下 endpoint 直接睇 backend JSON（Vite 會 proxy `/api` 去 API port；默認係 3001）：
- `/api/group-arb/crypto15m/history?refresh=true&intervalMs=1000&maxEntries=50`
- `/api/group-arb/cryptoall/history?refresh=true&intervalMs=1000&maxEntries=50`

你要睇嘅重點：
- `history`：Array，長度應該 <= `maxEntries`
- `summary.count`：有幾多 bets（通常應該同 `history` 大概一致；除非 summary 係全量、history 係截斷）
- `historyPersist.lastError`：如有，代表落盤/讀盤有錯（state dir 或 JSON 壞）

### Candidates + Ask（orderbook snapshot）
UI 嘅 candidates 來源一般係：
- `/api/group-arb/cryptoall/candidates?...&limit=XX`
- `/api/group-arb/crypto15m/candidates?...&limit=XX`

#### 先睇 books snapshot（最易釘死 no-asks 根因）
直接開呢個：
- `/api/group-arb/cryptoall/status`

你要睇嘅重點：
- `status.books.tokenCount`：**應該 > 0**；如果係 0，UI 幾乎一定會出現大量 `no-asks / 0.0c`
- `status.books.lastAttemptError`：如果有，代表 backend 抓 `/books` 失敗/被 throttled/blocked

你要睇嘅重點：
- `candidates.length`：同 UI rows 應該一致（除非 UI 有 sticky/merge）
- 每個 candidate 內嘅 `upPrice/downPrice`（或 bestAsk）係咪 null / 0
- 任何 orderbook refresh 錯誤都以 debug/status 為準（例如 `perTf.<tf>.books.lastAttemptError` 或 `status.books.lastAttemptError`）

**重要 invariant（永遠唔好再破壞）**
- 如果 UI 會展示 top 50 rows，backend 自動 refresh /books 就唔可以只做 top 5，否則 UI 其餘 rows 會長期 no-asks。
- 如果你見到 `status.books.tokenCount=0`，先處理 books snapshot（唔好先改 UI）。

---

## 2) Frontend 應該點「Mark DEBUG」同睇重點

### Crypto15m All 頁面（UI）
對應檔案：
- 前端頁：[Crypto15m.tsx](file:///Users/user/Documents/trae_projects/polymarket/static/FKPolyTools_Repo/web_front_src/src/pages/Crypto15m.tsx)

已加嘅 DEBUG 顯示（Tag）用途：
- **Candidates 區**：`Debug: {candidates?.length}` → 直接顯示前端 state 收到幾多 rows
- **History 區**：`H15 / HAll / Total` → 顯示 merge 後 state 內各策略 history 數量

> 規則：**如果 DEBUG 數字 > 0，但 Table rows 仍然 0，99% 係 render/key/filter 問題；唔係 backend。**

### Table rowKey（最常見 rows=0 真兇）
永遠要確保：
- 每一行 **rowKey 唔可以 null / undefined**
- 合併 view（All）入面，兩個來源可能 `id` 撞 / id=null，所以要有 `_ui_id` 或穩定 fallback key

---

## 3) 「唔好再錯」清單（硬性規矩）

### A. 唔好用「每秒變動」欄位做 signature 去重
反例：
- `secondsToExpire` 每秒變 → 會迫 UI 全表 re-render（lag + RAM 飆）

正解：
- countdown 交畀 row component 自己 tick（例如 CountdownTag）
- 上層 table state 更新只跟「業務資料」變化（price/eligibility/ids）

### B. Backend refresh 範圍要同 UI 展示一致
反例：
- backend auto loop 只 refresh top 5 books，但 UI 顯示 50 rows → 45 rows no-asks

正解：
- backend 用至少 `limit >= UI 展示上限`（或者 UI 應該顯示同 limit 一致）

### D. `/books` tokenId key 要做兼容解析
曾經踩過坑：
- CLOB `/books` 回傳常見係 `token_id`，唔一定有 `asset_id`
- 如果 backend 只用 `asset_id`，會令 `byTokenId` 對唔上 → `tokenCount=0` → UI 全 `no-asks`

排查方法（永遠第一步）：
1) 打 `/api/group-arb/cryptoall/status` 睇 `status.books.tokenCount`
2) 再打 `/api/group-arb/cryptoall/candidates` 睇 `upPrice/downPrice` 有冇值

### C. 先確認「backend 真係有 history」先改 UI
流程：
1) 先打 `/api/group-arb/.../history` 睇 `history.length`
2) 再睇 UI debug tag（Total / H15 / HAll）
3) 兩邊一致，先處理 UI；唔一致，先處理 backend 或 proxy/port

---

## 5) 2026-02：5M BTC 單一 event 仍 no-asks / 倒數 0 卡住 / 揀錯 ETH（一致性修復紀錄）

### A. 現象（你會喺 `crypto-15m-all` 見到）
- 5M 只得 1 條 BTC event（例如 `btc-updown-5m-...`）但 outcomes 兩邊都 `no-asks`
- 有時會出現「Expire(s) 倒數到 0 但 row 仲留喺 table 一段時間」
- 有時會見到 5M 出現 ETH（你預期應該只係 BTC）

### B. Backend 應該點釘死（唔好靠 UI 猜）
- 5M debug（最直接）：
  - `/api/group-arb/cryptoall/debug?timeframes=5m`
- 5M candidates（睇 reason / asksCount / prices）：
  - `/api/group-arb/cryptoall/candidates/ui?symbols=BTC,ETH,SOL,XRP&timeframes=5m&minProb=0.01&expiresWithinSec=10000&limit=20`

你要睇嘅重點（5M）：
- `perTf.5m.market.marketCount`：應該 > 0
- `perTf.5m.books.tokenCount`：應該係 2（Up/Down token）
- `perTf.5m.books.lastAttemptError`：應該係 null
- candidates row 內：
  - `asksCount` 應該 > 0
  - `prices` 應該係兩邊都有值（唔係 null）
  - `reason` 唔應該係 `no-asks`

### C. 根因（同 Crypto15M 真正唔一致位）
- **CryptoAll books refresh 有 3 秒 early-return gate**，會令「market 已換新 tokenIds」但 books 仍用舊 tokenIds，結果 UI 出 `no-asks`。
- **CryptoAll WS loop 逐 timeframe 刷 books**，而 `fetchClobBooks` 內部有全局 throttle/backoff；多次連環 call 容易令後面嗰個 tf（例如 5m）被餓死，單一 event 都會長期 `no-asks`。

> 呢個唔係「event 多所以壓力大」嘅問題，就算得 1 條 5M，都會因為 refresh 流程唔一致而壞。

### D. 修復（全部係對齊 Crypto15M 做法）
- **移除 cryptoall books 3 秒 gate**：books refresh 唔再用「固定最少間隔」早退，只保留 nextAllowed/backoff（遇到真錯先退避），行為同 Crypto15M 一樣。
- **WS / snapshot loop：每 tick 只刷新 primary timeframe books**：
  - 先揀出「最接近到期」嘅 timeframe（primary tf）
  - tick 內只 refresh 呢個 tf 嘅 books（同 Crypto15M：每次只顧一個 tf）
  - 避免 multi-tf 連環刷新觸發全局 throttle
- **5M predicted 對齊 Crypto15M**：只試 `baseStart-tfSec, baseStart, baseStart+tfSec` 三格 start；同時收緊 `expectedEndMs` guard，避免 1D/4H 誤入 5M。

### E. 驗收標準（對齊一致性）
- 單一 5M BTC event 必須：
  - `marketCount>0`
  - `tokenCount=2`
  - `asksCount>0`、`prices` 有值
  - `books.lastAttemptError=null`
- 倒數到 0 後，row 必須在 1–2 次 refresh 內消失/換新（唔可以長期停留）

### F. 2026-02-2：每隔 5 分鐘出現 `No tokenIds for books refresh (no markets)`（rollover 一致性）
現象：
- 5M 行會顯示紅字 `No tokenIds for books refresh (no markets)`（代表 books refresh 當刻搵唔到 markets → 冇 tokenIds）

釘死方法（只睇 backend）：
- `/api/group-arb/cryptoall/debug?timeframes=5m`
  - 先睇 `perTf.5m.market.marketCount` 有冇跌到 0
  - 再睇 `perTf.5m.books.lastAttemptError` 係咪出現 `No tokenIds...`

根因（一致性問題）：
- CryptoAll market refresh 曾用 ET 對齊去計 startSec，rollover 時會短暫 miss 新市場 → markets 變空 → books 冇 tokenIds。

修復（對齊 Crypto15M）：
- CryptoAll startSec/baseStart 一律改用 **UTC floor**（同 Crypto15M 一樣）
- 加保險：新一輪 refresh 搵唔到 markets 時，保留仍有效舊 markets，避免 books 直接報 no markets

驗收標準：
- 跨過一次 5m rollover（例如等到下一個 5 分鐘整點後 30–60 秒）
  - `perTf.5m.market.marketCount` 持續 > 0
  - `perTf.5m.books.lastAttemptError` 唔再出現 `No tokenIds...`

---

## 6) 新增/擴展 EVENT / timeframe 指引（重點：一致性）

### A. 一致性硬規則（必須跟 Crypto15M）
- **來源只用兩種**：site slugs + predicted slugs（唔好加 Crypto15M 冇用嘅兜底玩法去解釋/遮掩）
- **predicted 只試三格 start**：`baseStart-tfSec, baseStart, baseStart+tfSec`（倒數緊就必然係呢個範圍內）
- **startSec/baseStart 一律 UTC floor**：唔可以混入 ET 對齊（Crypto15M 作準）
- **timeframe guard 必須硬校驗**：
  - slug 有 startSec：要求 `expectedEndMs=(startSec+tfSec)*1000` 同 market endMs 接近（容忍 60s 內）
  - 過唔到就丟棄（防止「1D 剩 5 分鐘」被誤當 5M）
- **books refresh 必須跟 UI 展示一致**：
  - UI 會展示 top N rows，books refresh tokenIds 必須覆蓋 N rows（唔好只 refresh top 5）
  - WS tick 只刷新 primary tf books，避免全局 throttle 令某個 tf 長期 no-asks

### B. 你每次新增完都要做嘅驗收（5 分鐘內完成）
1) 打 debug：
   - `/api/group-arb/cryptoall/debug?timeframes=<tf>`
   - 望 `perTf.<tf>.market.marketCount>0`、`perTf.<tf>.books.tokenCount>0`、`perTf.<tf>.books.lastAttemptError=null`
2) 打 candidates/ui：
   - `/api/group-arb/cryptoall/candidates/ui?...&timeframes=<tf>`
   - 望 `asksCount>0`、`prices` 有值、`reason!=no-asks`
3) 開 UI：
   - `http://localhost:5173/crypto-15m-all`
   - 倒數到 0 後 1–2 次 refresh 內換新
4) 做 rollover 測試（必做）：
   - 跨過一次 timeframe 邊界（5m 就等到下一個 5 分鐘整點）
   - 確認唔會出現 `No tokenIds for books refresh (no markets)`

---

## 7) Git 分支（避免再「亂改」）

建議工作方法（你之後會 cover 我條 branch）：
- 每個問題一條分支（例如 `fix/crypto15m-history-render`）
- 改動前先寫清楚「驗證方式」同「預期數字」（例如 history 50 rows、no-asks=0）
- 唔好混埋 UI/Backend 多個議題一次過改，否則好難回溯責任
