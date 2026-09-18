<div align="center">

# PanNexus (盘纽)

**新一代联邦多网盘与磁力资源聚合索引引擎**

基于 Nuxt 3 + Cloudflare Pages + D1 (SQLite FTS5) + Queues + Cron Triggers 构建

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Vitest](https://img.shields.io/badge/tests-112%20passed-emerald.svg)](tests/)
[![Cloudflare](https://img.shields.io/badge/edge-Cloudflare%20Pages%20%2B%20D1-orange.svg)](https://pages.cloudflare.com/)
[![Vue 3](https://img.shields.io/badge/vue-3.5-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)](https://www.typescriptlang.org/)

[简体中文](./README.md) · [English](./README_EN.md) · [生产部署指南](./DEPLOY.md)

</div>

---

## 界面预览

![PanNexus 界面预览](./docs/screenshots/preview.png)

---

## 痛点与设计理念

目前市面上的网盘与磁力搜索工具通常存在以下硬伤：
- **实时滥抓**：用户每搜一个关键词，后端现场并发向几十个站点爬取，平均耗时 5~15 秒，上游稍有卡顿或反爬直接导致前端超时崩溃；
- **垃圾与重复泛滥**：同部影视、软件在不同网盘有大量重复条目，缺乏指纹级去重和实体聚合；
- **虚假与死链无过滤**：搜索结果充斥引流假链接、失效网盘与死种，缺乏做种健康度和可用性评分。

**PanNexus 采用「本地索引优先，联邦实时补充」的双层解耦架构：**
1. **毫秒级本地命中 (Local-First D1 Index)**：搜索请求默认直接查询 Cloudflare D1 边缘数据库，基于 SQLite FTS5 全文索引，P50 响应时间 < 80ms，无惧高并发与上游封禁；
2. **按需联邦深度检索 (Live Deep Search)**：用户需要最新鲜资源时，可一键开启深度检索，系统通过 Server-Sent Events (SSE) 并发调度活跃数据源流式推送，并**异步写回 D1 数据库**，实现索引自动增长；
3. **后台调度与死信队列 (Cron + Queue Consumer)**：独立 Cloudflare Worker 定期抓取真实协议源，失败 3 次自动沉淀至死信队列（`failed_jobs`），保障任务可追溯、可重试。

---

## 架构拓扑

```
                       ┌───────────────────────────────┐
                       │         浏览器用户 (Web)      │
                       └──────────────┬────────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │                                                   │
    [本地索引检索 (P50 < 80ms)]                         [按需联邦深度检索 (SSE)]
            │                                                   │
            ▼                                                   ▼
┌───────────────────────┐                             ┌───────────────────┐
│ Cloudflare Pages      │                             │ SSE 流式并发推流  │
│ Nuxt 3 Nitro API      │                             └─────────┬─────────┘
└───────────┬───────────┘                                       │
            │ (Query)                                           │ (异步入库)
            ▼                                                   │
┌───────────────────────┐                                       │
│ Cloudflare D1 (FTS5)  │◄──────────────────────────────────────┘
│ url_hash / infohash   │
│ UNIQUE 强约束去重     │
└───────────▲───────────┘
            │ (调度写入)
┌───────────┴───────────┐         内部鉴权代理       ┌─────────────────────────┐
│ Pages 内部端点        │◄──────────────────────────│ Cloudflare Worker       │
│ /api/v1/internal/*    │  (Bearer METASEEK_CRON)   │ 定时器 (Cron Triggers)  │
└───────────────────────┘                           │ 队列消费者 (Queue Batch)│
                                                    └─────────────────────────┘
```

---

## 核心特性

- **坚决剔除假数据**：绝不通过关键词凭空拼接虚假网盘链接，仅对接真实公开协议源（Nyaa RSS、动漫花园 DMHY RSS、Torznab/Jackett、Telegram 频道公开预览、AList v3 等）。
- **指纹级强约束去重**：底层针对 `url_hash` 与 `infohash` 施加严格 `UNIQUE` 索引，结合统一 Ingest 管道实现原子级冲突合并与 `last_seen_at` 活跃度刷新。
- **实体聚类与多维打分**：资源层（Resource）通过标准化算法聚合为作品级实体（Canonical Entity），综合文本相关度、做种健康度（Seeders）、体积合理度与发现新鲜度进行动态加权打分。
- **全链路合规过滤**：内置基于违规关键词、垃圾推广域名、违规 BTIH 散列的多维拦截黑名单，在爬虫采集、SSE 推流及 D1 检索全链路生效。
- **生产级安全防护**：
  - 内存滑动窗口限流（普通搜索 60次/分，深度检索 15次/分，后台登录 5次/分）；
  - 全局 SSRF 保护（拦截私网回环地址、云元数据端点与异常内网重定向）；
  - 管理后台安全会话口令校验，彻底杜绝默认空口令。
- **可视化运维控制台**：直观查看各协议数据源健康评分、熔断状态（Circuit Breaker）、死信队列重试记录。

---

## 技术栈

- **前端框架**：[Nuxt 3](https://nuxt.com/) (Vue 3, TypeScript, Composition API)
- **UI 风格**：Tailwind CSS (Vercel / Linear Minimalist, 暗黑模式自适应, Lucide Icons)
- **边缘运行时**：Cloudflare Pages + Cloudflare Workers (Node.js 兼容模式)
- **存储引擎**：Cloudflare D1 (分布式 SQLite + FTS5 全文索引) + Cloudflare KV
- **队列与定时**：Cloudflare Queues + Cron Triggers (`*/30 * * * *`)
- **测试框架**：[Vitest 3](https://vitest.dev/) (包含 27 个测试套件，112 项单元测试)

---

## 快速上手

### 环境准备
- Node.js >= 18.0.0
- pnpm >= 9.0.0

### 1. 克隆代码与安装依赖

```bash
git clone https://github.com/your-username/pannexus.git
cd pannexus
pnpm install
```

### 2. 初始化本地 D1 数据库

```bash
# 初始化表结构、迁移唯一约束并灌入演示种子数据
pnpm db:setup
```

### 3. 运行全量单元测试

```bash
pnpm test
```
> 目前包含 27 个测试文件、112 项测试用例，涵盖 SSRF 防护、去重合并、打分算法、限流中间件等核心模块，全量绿灯通过。

### 4. 启动本地开发服务

```bash
pnpm dev
```
启动完成后访问 `http://localhost:3000` 即可开始使用。

> **Windows 一键启动**：双击运行项目根目录下的 `start.bat` 或在 PowerShell 中执行 `.\start.ps1`，提供开箱即用的环境检测与交互式菜单。

---

## 配置文件说明 (`.env`)

复制环境配置模版：

```bash
cp .env.example .env
```

根据需要填写密钥：

```env
# 管理员控制台会话口令 (访问 /admin 登录)
METASEEK_ADMIN_TOKEN=your-strong-admin-token

# Cloudflare Worker 与 Pages 内部端点通信签名秘钥
METASEEK_CRON_SECRET=your-internal-cron-secret

# 外部上游可选凭证 (若不需要可保持留空)
TORZNAB_URL=
TORZNAB_API_KEY=
ALIST_BASE_URL=
ALIST_TOKEN=
TMDB_API_KEY=
```

---

## 生产部署 (Cloudflare Pages + Workers)

项目已完整配置 Cloudflare 生产拓扑。详细步骤请参阅 [DEPLOY.md](./DEPLOY.md)。

简要发布指令：

```bash
# 1. 创建远程 D1 数据库与队列
npx wrangler d1 create metaseek-db
npx wrangler queues create metaseek-crawl-queue

# 2. 执行远程数据库初始化与迁移
npx wrangler d1 execute metaseek-db --remote --file=./database/schema.sql
npx wrangler d1 execute metaseek-db --remote --file=./database/migrations/0003_dedup_and_jobs.sql

# 3. 构建并发布 Pages 前端
pnpm build
pnpm deploy:pages

# 4. 发布后台调度与消费 Worker
pnpm deploy:crawler
```

---

## 免责声明

1. 本项目仅供技术研究与交流使用，不存储任何资源文件本体；
2. 索引数据均来自于互联网公开协议与公开站点，请严格遵守当地法律法规，切勿用于违法用途。

---

## 开源协议

本项目基于 [Apache-2.0 License](./LICENSE) 开源发布。
