# 部署指南（Cloudflare Workers）

本项目前端基于 Create React App，生产构建产物输出到根目录 `build/`。Cloudflare Worker 通过 `cloudflare/wrangler.toml` 的 `assets` 配置，将 `../build` 作为静态资源随 Worker 一并部署（已不再使用 R2）。

## 前置条件

- Node.js 18+（建议 LTS）
- Wrangler CLI：`npm install -g wrangler`
- Cloudflare 登录态（二选一）：
  - `wrangler login`
  - 或在 `cloudflare/.env` 中提供 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`

## 快速部署

1) 配置环境变量（可选，若已 `wrangler login` 可跳过）

```bash
cd cloudflare
cp .env.example .env
```

2) 执行部署

```bash
# 在仓库根目录
npm run deploy
```

`npm run deploy` 会执行 `cloudflare/deploy.js`：安装根目录依赖、构建 `build/`，然后运行 `wrangler deploy -c cloudflare/wrangler.toml --keep-vars`（保留控制台已有 vars，如 `ADMIN_SECRET`）。

## 配置要点

- 静态资源：`cloudflare/wrangler.toml` 中 `assets = { directory = "../build", binding = "ASSETS" }`
- 自定义域名：`cronwin.techfetch.dev`、`wincron.techfetch.dev`、`taskscheduler.techfetch.dev`（写在 `wrangler.toml` 的 `routes`，发布时用 `--keep-vars`）
- 数据库：`cloudflare/wrangler.toml` 中 D1 绑定 `DB`，库名 `cronwin-stats`，建表脚本见 `cloudflare/schema.sql`
- 前端统计：独立 GA4 property `wincron`（`510153466`）。生产默认 `REACT_APP_GA_MEASUREMENT_ID=G-X9SWY9XJQQ`（`cronwin.techfetch.dev`）；`wincron.techfetch.dev` 用 `G-CEFCKBHQ59`，`taskscheduler.techfetch.dev` 用 `G-SL4XBKRQ0Y`
- 管理页：如需启用 `/admin/stats`，请设置 Worker Secret `ADMIN_SECRET`（推荐 `wrangler secret put ADMIN_SECRET`），避免将密钥写入配置文件或提交到仓库

## 常用命令（cloudflare/）

- `npm run deploy`：构建并发布 Worker（含静态资源）
- `npm run worker:dev`：本地开发（会先初始化本地 D1，再 `wrangler dev`）
- `npm run db:init`：初始化本地 D1（使用 `schema.sql`）
- `npm run logs`：实时日志（`wrangler tail`）
- `npm run analytics`：分析（`wrangler analytics`）

## 故障排查

- `Authentication error [code: 10000]`：未登录或 Token 权限不足；优先执行 `wrangler login`，或检查 `.env` 的 Token/AccountID
- 静态资源 404：确认已执行构建且存在 `build/index.html`
