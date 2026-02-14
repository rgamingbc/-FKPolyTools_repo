# DEBUG / HISTORY / ASK（Backend vs Frontend）永遠提醒（唔好再錯）

呢份文檔係針對 `http://localhost:5173/crypto-15m-all` 呢類頁面，長期避免重覆犯錯：UI 顯示 rows=0、no-asks、history 空，但 backend 其實有/冇資料。

## 一句講清楚（最常見成因）
- **UI rows=0 唔等於 backend 冇資料**：好多時係 React Table `rowKey` 撞 key / null key，或者前端用咗「signature 去重」導致 state 唔更新。
- **no-asks 唔等於 market 冇 ask**：通常係 backend 只 refresh 咗少量 candidates（例如 limit=5），UI 展示嘅其餘 rows 冇 orderbook snapshot，所以顯示 no-asks / 0.0c。
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

你要睇嘅重點：
- `candidates.length`：同 UI rows 應該一致（除非 UI 有 sticky/merge）
- 每個 candidate 內嘅 `upPrice/downPrice`（或 bestAsk）係咪 null / 0
- 有冇 `booksAttemptError` / `riskError` 類欄位（代表 backend fetch /books 失敗）

**重要 invariant（永遠唔好再破壞）**
- 如果 UI 會展示 top 50 rows，backend 自動 refresh /books 就唔可以只做 top 5，否則 UI 其餘 rows 會長期 no-asks。

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

### C. 先確認「backend 真係有 history」先改 UI
流程：
1) 先打 `/api/group-arb/.../history` 睇 `history.length`
2) 再睇 UI debug tag（Total / H15 / HAll）
3) 兩邊一致，先處理 UI；唔一致，先處理 backend 或 proxy/port

---

## 4) Git 分支（避免再「亂改」）

建議工作方法（你之後會 cover 我條 branch）：
- 每個問題一條分支（例如 `fix/crypto15m-history-render`）
- 改動前先寫清楚「驗證方式」同「預期數字」（例如 history 50 rows、no-asks=0）
- 唔好混埋 UI/Backend 多個議題一次過改，否則好難回溯責任

