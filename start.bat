@echo off
chcp 65001 >nul
title MetaSeek · 联邦资源索引与聚合搜索平台
cd /d "%~dp0"

:menu
cls
echo =====================================================================
echo          MetaSeek · 联邦资源索引与聚合搜索平台 (One-Click Launcher)
echo =====================================================================
echo.
echo   [1] 启动本地开发服务 (推荐，即开即用: pnpm dev)
echo   [2] 运行全量自动化测试 (Vitest: 41项算法与协议测试)
echo   [3] 生产环境编译构建 (Cloudflare Pages bundle: pnpm build)
echo   [4] 模拟 Cloudflare 边缘运行环境 (pnpm build + Wrangler dev)
echo   [5] 初始化本地 SQLite D1 数据库与导入种子数据
echo   [0] 退出
echo.
echo =====================================================================
set /p choice="请输入选项编号 [默认回车为 1]: "

if "%choice%"=="" set choice=1
if "%choice%"=="1" goto dev
if "%choice%"=="2" goto test
if "%choice%"=="3" goto build
if "%choice%"=="4" goto wrangler
if "%choice%"=="5" goto d1
if "%choice%"=="0" goto exit

echo.
echo [错误] 无效的输入，请重新选择。
timeout /t 2 >nul
goto menu

:dev
cls
echo =====================================================================
echo 正在启动 MetaSeek 本地开发服务器...
echo 服务启动后，请在浏览器访问: http://localhost:3000
echo 按 Ctrl + C 可终止服务
echo =====================================================================
echo.
pnpm dev
goto end

:test
cls
echo =====================================================================
echo 正在运行自动化测试套件 (Vitest)...
echo =====================================================================
echo.
pnpm test
goto end

:build
cls
echo =====================================================================
echo 正在执行 Cloudflare Pages 生产构建...
echo =====================================================================
echo.
pnpm build
goto end

:wrangler
cls
echo =====================================================================
echo 正在执行生产构建并启动 Wrangler 边缘模拟器...
echo =====================================================================
echo.
call pnpm build
if %errorlevel% neq 0 (
  echo [错误] 生产构建失败，中止启动。
  goto end
)
npx wrangler pages dev dist
goto end

:d1
cls
echo =====================================================================
echo 正在初始化本地 Cloudflare D1 (SQLite FTS5 Trigram) 数据库...
echo =====================================================================
echo.
call pnpm d1:init
echo.
echo 正在灌入初始网盘与磁力种子数据...
call pnpm d1:seed
echo.
echo [成功] 本地 D1 数据库初始化完毕！
goto end

:end
echo.
echo =====================================================================
echo 执行完毕。按任意键返回主菜单...
pause >nul
goto menu

:exit
exit /b 0
