# Private Backup (No Fork)

目標：在 GitHub 建立一份 private backup repo，且不顯示 Forked from（不使用 fork）。

## 重點

- Public repo 不能做 private fork（fork 會繼承可見性）。
- 要做到私有且不顯示 fork 關係：用新 repo + mirror push。

## 方案 A（推薦）：新建 private repo + mirror push

### 1) 在 GitHub 新建 private repo

例如 repo 名：

    FKPolyTools_private_backup

### 2) 在本機 mirror（一次性建立）

以下把目前 online repo 完整鏡像到一個 bare repo 目錄：

    cd /Users/user/Documents/trae_projects/polymarket/static
    git clone --mirror https://github.com/rgamingbc/FKPolyTools_repo.git FKPolyTools_private_backup.git

### 3) 推送到你的 private repo（第一次 push）

把 URL 換成你新建 private repo 的 URL：

    cd /Users/user/Documents/trae_projects/polymarket/static/FKPolyTools_private_backup.git
    git push --mirror https://github.com/YOUR_GITHUB_USERNAME/FKPolyTools_private_backup.git

## 之後如何更新（每日/每次大改前）

進入 mirror repo 後做 fetch + mirror push：

    cd /Users/user/Documents/trae_projects/polymarket/static/FKPolyTools_private_backup.git
    git fetch --prune
    git push --mirror https://github.com/YOUR_GITHUB_USERNAME/FKPolyTools_private_backup.git

## 登入/授權（你只需在你自己電腦完成）

### A) HTTPS + PAT（建議）

- GitHub 已不再接受「帳號密碼」push；要用 Personal Access Token (PAT) 當作密碼。
- PAT 建議權限：repo（只需 private repo 權限即可）。

### B) SSH（如果你已經有 ssh key）

- 把 remote URL 換成 SSH 版本再 push。

## 安全提醒

- 任何 .env、私鑰、builder secret 不應提交到 git。
- private repo 仍然只能降低外泄風險；獲授權的人仍然可以複製 code。

