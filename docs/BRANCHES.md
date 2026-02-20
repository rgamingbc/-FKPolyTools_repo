# Branch 說明（FKPolyTools）

## Repo（正確）

- GitHub repo：`rgamingbc/-FKPolyTools_repo`
  - HTTPS：`https://github.com/rgamingbc/-FKPolyTools_repo.git`
  - SSH：`git@github.com:rgamingbc/-FKPolyTools_repo.git`

如你喺其他 repo（例如 `polymarket-arbitrage-trading-tool`）用同名 branch 去 compare，會出現 “unrelated histories / There isn’t anything to compare”，因為根本唔係同一套 commit 歷史。

## 分支策略（簡單）

- `main`
  - 主要穩定分支（建議部署/日常更新用）

- `docs/15m-debug-install-sync-20260220`
  - 用途：修復 / 補回 15M2 相關 endpoints、以及排查安裝/同步問題嘅文件更新
  - 合併方式：PR merge 入 `main`，部署機用 `git pull --ff-only` 更新即可

## 更新建議

- 部署/日常更新：只跟 `main`
- 臨時熱修：由 `main` 開新 branch，PR merge，保持 histories 同 `main` 一致
