# Dev Workflow (Local) + Git Push/Pull (Cloud)

目標：雲端穩定運作；本機離線繼續開發新策略；上線只靠 Git pull + build + restart。

## 一句總結

本機開發用 feature 分支；合併到 main；打 release tag；雲端只部署 tag。

## Git 分支與 Tag 規則

    main
    feature/xxx
    fix/xxx

release tag 建議格式：

    vYYYYMMDD-HHMM

## Secrets 規則（非常重要）

以下永遠不入 git：

    api_src/.env
    /var/lib/polymarket-tools/relayer.json
    任何私鑰、passphrase、builder secret

## 本機開發（Local）

### 1) 取得程式碼

    cd /Users/user/Documents/trae_projects/polymarket/static
    git clone YOUR_GIT_URL FKPolyTools_Repo
    cd FKPolyTools_Repo

### 2) 開發分支

    git checkout main
    git pull
    git checkout -b feature/new-strategy

### 3) 本機跑 API/Web

API：

    cd api_src
    npm ci
    npm run dev

Web：

    cd web_front_src
    npm ci
    npm run dev

### 4) 提交前 checklist（每次都做）

    cd api_src
    npm run build

    cd web_front_src
    npm run build

## 發布（Local → Git）

### 1) 合併回 main

    git checkout main
    git pull
    git merge feature/new-strategy

### 2) 打 tag + push

    git tag -a v20260202-1800 -m release
    git push origin main
    git push origin v20260202-1800

## 雲端部署（EC2）

雲端只做 pull tag + build + restart，細節見 docs/OPS-DEPLOY.md。

## 溝通格式（你同我之後協作）

每次你話要上線，我只需要你提供以下四點：

    1) 目標 tag 名
    2) 改動範圍（API 路由/策略/頁面）
    3) 風控/策略參數變更（minProb/expiresWithinSec/amountUsd）
    4) 部署後要驗收嘅 endpoints

