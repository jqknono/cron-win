# Cloudflare Workers 部署（无 R2）

本目录包含 Worker 与部署脚本。静态资源不再上传到 R2，而是通过 `wrangler.toml` 的 `assets` 配置从仓库根目录 `build/` 直接随 Worker 一并部署。

## 关键文件

- `cloudflare/worker.js`：Worker 入口（静态资源从 `ASSETS` 读取，API 使用 D1 `cronwin-stats.downloads` 记录下载统计）
- `cloudflare/wrangler.toml`：Wrangler 配置（`assets` + D1 绑定 `DB`）
- `cloudflare/deploy.js`：一键部署（构建 + `wrangler deploy`）
- `cloudflare/schema.sql`：D1 表结构

## 常用命令

在仓库根目录执行：

- `npm run deploy`：构建并部署

在 `cloudflare/` 目录执行：

- `npm run worker:dev`
- `npm run db:init`
- `npm run logs`
- `npm run analytics`

更完整说明见根目录 `DEPLOYMENT.md`。
