@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
title MetaSeek Launcher

:menu
cls
echo =====================================================================
echo         MetaSeek · 联邦资源索引与聚合搜索平台 (One-Click Launcher)
echo =====================================================================
echo.
echo   [1] 启动本地开发服务 (推荐: pnpm dev)
echo   [2] 运行全量自动化测试 (Vitest: 41项算法与协议测试)
echo   [3] 生产环境编译构建 (Cloudflare Pages bundle: pnpm build)
echo   [4] 模拟 Cloudflare 边缘运行环境 (Wrangler dev)
echo   [5] 初始化本地 SQLite D1 数据库与导入种子数据
echo   [0] 退出
echo.
echo =====================================================================
set "choice="
set /p choice="请输入选项编号 [直接回车默认启动 1]: "
if not defined choice set choice=1

if "%choice%"=="1" goto dev
if "%choice%"=="2" goto test
if "%choice%"=="3" goto build
if "%choice%"=="4" goto wrangler
if "%choice%"=="5" goto d1
if "%choice%"=="0" goto exit

echo [错误] 无效选项，请重新输入。
timeout /t 2 >nul
goto menu

:dev
cls
echo 正在启动 MetaSeek 本地开发服务...
echo 访问地址: http://localhost:3000
echo 按 Ctrl + C 可终止服务。
echo ---------------------------------------------------------------------
where pnpm >nul 2>nul
if !errorlevel! equ 0 (
  call pnpm dev
) else (
  call npx pnpm dev
)
pause
goto menu

:test
cls
echo 正在运行自动化测试套件...
echo ---------------------------------------------------------------------
where pnpm >nul 2>nul
if !errorlevel! equ 0 (
  call pnpm test
) else (
  call npx pnpm test
)
pause
goto menu

:build
cls
echo 正在执行生产构建...
echo ---------------------------------------------------------------------
where pnpm >nul 2>nul
if !errorlevel! equ 0 (
  call pnpm build
) else (
  call npx pnpm build
)
pause
goto menu

:wrangler
cls
echo 正在构建并模拟 Cloudflare 边缘环境...
echo ---------------------------------------------------------------------
where pnpm >nul 2>nul
if !errorlevel! equ 0 (
  call pnpm build
) else (
  call npx pnpm build
)
call npx wrangler pages dev dist
pause
goto menu

:d1
cls
echo 正在初始化本地 D1 数据库与导入初始数据...
echo ---------------------------------------------------------------------
where pnpm >nul 2>nul
if !errorlevel! equ 0 (
  call pnpm d1:init
  call pnpm d1:seed
) else (
  call npx pnpm d1:init
  call npx pnpm d1:seed
)
pause
goto menu

:exit
exit /b 0