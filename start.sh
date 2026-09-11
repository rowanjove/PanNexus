#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

show_menu() {
  clear
  echo "====================================================================="
  echo "         MetaSeek · 联邦资源索引与聚合搜索平台 (One-Click Launcher)"
  echo "====================================================================="
  echo ""
  echo "  [1] 启动本地开发服务 (推荐，即开即用: pnpm dev)"
  echo "  [2] 运行全量自动化测试 (Vitest: 41项算法与协议测试)"
  echo "  [3] 生产环境编译构建 (Cloudflare Pages bundle: pnpm build)"
  echo "  [4] 模拟 Cloudflare 边缘运行环境 (pnpm build + Wrangler dev)"
  echo "  [5] 初始化本地 SQLite D1 数据库与导入种子数据"
  echo "  [0] 退出"
  echo ""
  echo "====================================================================="
  read -p "请输入选项编号 [默认回车为 1]: " choice
  choice=${choice:-1}

  case $choice in
    1)
      echo "正在启动本地开发服务器..."
      pnpm dev
      ;;
    2)
      echo "正在运行自动化测试套件 (Vitest)..."
      pnpm test
      ;;
    3)
      echo "正在执行生产构建..."
      pnpm build
      ;;
    4)
      echo "正在执行生产构建并启动 Wrangler 边缘模拟器..."
      pnpm build
      npx wrangler pages dev dist
      ;;
    5)
      echo "正在初始化本地 D1 数据库..."
      pnpm d1:init
      pnpm d1:seed
      ;;
    0)
      exit 0
      ;;
    *)
      echo "无效选项，按回车重试..."
      read
      show_menu
      ;;
  esac
}

show_menu
