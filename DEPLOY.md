# PanNexus (盘纽) · Cloudflare 生产环境完全部署指南

本文档指导你将 PanNexus 从本地环境完整部署至 Cloudflare 边缘计算平台。

---

## 部署拓扑架构

由于 Cloudflare Pages Functions 目前不直接响应 Cron Triggers 和 Queue Consumers，PanNexus 采用官方推荐的**双部署架构**：
1. **PanNexus Web (Pages)**：运行 Nuxt 3 前端界面与核心 Nitro SSR API，绑定 D1 数据库；
2. **PanNexus Crawler (Worker)**：轻量调度器，响应 `*/30 * * * *` 定时器与队列消费事件，通过带密钥签名的 HTTP 调用 Pages 内部端点执行实际业务。

---

## 第一步：创建 Cloudflare 边缘资源

在本地终端登录 Cloudflare：

```bash
npx wrangler login
```

### 1. 创建 D1 数据库

```bash
npx wrangler d1 create metaseek-db
```
执行后终端会输出类似如下信息：
```
[[d1_databases]]
binding = "DB"
database_name = "metaseek-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
记下 `database_id`。

### 2. 创建 KV 命名空间

```bash
npx wrangler kv namespace create METASEEK_KV
```
记下输出中的 `id`。

### 3. 创建 Cloudflare 队列 (Queues)

```bash
npx wrangler queues create metaseek-crawl-queue
```

---

## 第二步：配置项目文件

### 1. 修改 `wrangler.jsonc`
将上面获取的真实 ID 替换到 `wrangler.jsonc` 中：

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "metaseek",
  "compatibility_date": "2025-02-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": "./dist",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "metaseek-db",
      "database_id": "你的真实-database-id", // <-- 替换此处
      "migrations_dir": "./database/migrations"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "METASEEK_KV",
      "id": "你的真实-kv-id" // <-- 替换此处
    }
  ],
  "queues": {
    "producers": [
      {
        "binding": "CRAWL_QUEUE",
        "queue": "metaseek-crawl-queue"
      }
    ]
  }
}
```

### 2. 修改 `wrangler.crawler.jsonc`
将你的 Pages 线上访问域名填入 `APP_URL`：

```jsonc
{
  "name": "metaseek-crawler",
  "main": "server/cloudflare/worker.ts",
  "compatibility_date": "2025-02-01",
  "compatibility_flags": ["nodejs_compat"],
  "vars": {
    "APP_URL": "https://你的pages项目域名.pages.dev" // <-- 替换此处
  },
  "triggers": {
    "crons": ["*/30 * * * *"]
  },
  "queues": {
    "producers": [
      {
        "binding": "CRAWL_QUEUE",
        "queue": "metaseek-crawl-queue"
      }
    ],
    "consumers": [
      {
        "queue": "metaseek-crawl-queue",
        "max_batch_size": 5,
        "max_batch_timeout": 30,
        "max_retries": 3
      }
    ]
  }
}
```

---

## 第三步：初始化远程 D1 数据库

使用 `--remote` 标识将表结构和初始化数据灌入远程 Cloudflare D1：

```bash
# 1. 初始化表结构与 FTS5 虚拟表
npx wrangler d1 execute metaseek-db --remote --file=./database/schema.sql

# 2. 执行唯一索引约束与死信表迁移
npx wrangler d1 execute metaseek-db --remote --file=./database/migrations/0003_dedup_and_jobs.sql

# 3. 灌入基础演示数据 (可选)
npx wrangler d1 execute metaseek-db --remote --file=./database/seed.sql
```

---

## 第四步：编译并部署 Pages 主服务

```bash
# 执行 Nuxt 3 生产构建 (生成 dist/_worker.js)
pnpm build

# 部署到 Cloudflare Pages
pnpm deploy:pages
```

部署成功后，终端会给出你的 Pages 线上访问地址（如 `https://metaseek.pages.dev`）。

在 Cloudflare Pages 控制台的 **Settings -> Environment variables** 中设置生产密钥：
- `METASEEK_ADMIN_TOKEN`: 你的管理后台登录口令
- `METASEEK_CRON_SECRET`: 内部调度密钥（需与 Crawler 保持一致）
- `METASEEK_INGEST_TOKEN`: 数据灌入 API 密钥
- （可选）`TORZNAB_URL` / `TORZNAB_API_KEY` / `ALIST_BASE_URL` / `ALIST_TOKEN`

---

## 第五步：配置并部署 Crawler 调度器

在命令行中设置 Worker 的通信密钥：

```bash
# 设置与 Pages 保持一致的 CRON_SECRET
npx wrangler secret put METASEEK_CRON_SECRET --config wrangler.crawler.jsonc
```

部署 Worker：

```bash
pnpm deploy:crawler
```

---

## 第六步：线上验收检查清单

1. **访问前台**：打开 `https://你的域名.pages.dev`，检查首页统计是否正常显示，输入关键词测试检索；
2. **测试深度检索**：在搜索结果页点击「深度检索」，观察 SSE 状态指示灯与推流新增结果；
3. **登录管理后台**：访问 `/admin`，输入你设置的 `METASEEK_ADMIN_TOKEN` 登录，检查数据源状态与死信队列；
4. **手动触发采集**：在后台「数据源大盘」点击「全量采集」或指定节点采集，验证数据入库与 D1 写入正常；
5. **验证死信容错**：在有失败任务时，切换至「死信队列」Tab，点击「立即重试」，验证自动恢复机制。
