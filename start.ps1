# MetaSeek · 联邦资源索引与聚合搜索平台 (PowerShell One-Click Launcher)
Set-Location -Path $PSScriptRoot
$Host.UI.RawUI.WindowTitle = "MetaSeek · 联邦资源索引与聚合搜索平台"

function Show-Menu {
    Clear-Host
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host "         MetaSeek · 联邦资源索引与聚合搜索平台 (One-Click Launcher)" -ForegroundColor Cyan
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  [1] 启动本地开发服务 (推荐，即开即用: pnpm dev)" -ForegroundColor Green
    Write-Host "  [2] 运行全量自动化测试 (Vitest)" -ForegroundColor Yellow
    Write-Host "  [3] 生产环境编译构建 (Cloudflare Pages bundle: pnpm build)" -ForegroundColor White
    Write-Host "  [4] 模拟 Cloudflare 边缘运行环境 (pnpm build + Wrangler dev)" -ForegroundColor White
    Write-Host "  [5] 初始化本地 SQLite D1 数据库与导入种子数据" -ForegroundColor White
    Write-Host "  [0] 退出" -ForegroundColor Gray
    Write-Host ""
    Write-Host "=====================================================================" -ForegroundColor Cyan

    $choice = Read-Host "请输入选项编号 [直接回车默认启动 1]"
    if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

    switch ($choice) {
        "1" {
            Clear-Host
            Write-Host "正在启动 MetaSeek 本地开发服务..." -ForegroundColor Green
            Write-Host "浏览器访问: http://localhost:3000" -ForegroundColor Cyan
            Write-Host "按 Ctrl + C 可终止服务" -ForegroundColor Gray
            Write-Host ""
            pnpm dev
        }
        "2" {
            Clear-Host
            Write-Host "正在运行自动化测试套件 (Vitest)..." -ForegroundColor Yellow
            pnpm test
            Read-Host "按回车键返回主菜单..."
            Show-Menu
        }
        "3" {
            Clear-Host
            Write-Host "正在执行 Cloudflare Pages 生产构建..." -ForegroundColor White
            pnpm build
            Read-Host "按回车键返回主菜单..."
            Show-Menu
        }
        "4" {
            Clear-Host
            Write-Host "正在执行生产构建并启动 Wrangler 边缘模拟器..." -ForegroundColor White
            pnpm build
            npx wrangler pages dev dist
            Read-Host "按回车键返回主菜单..."
            Show-Menu
        }
        "5" {
            Clear-Host
            Write-Host "正在初始化本地 D1 数据库、执行迁移与导入种子数据..." -ForegroundColor White
            pnpm d1:init
            pnpm d1:migrate
            pnpm d1:seed
            Read-Host "按回车键返回主菜单..."
            Show-Menu
        }
        "0" {
            exit 0
        }
        Default {
            Write-Host "无效选项，请重新选择。" -ForegroundColor Red
            Start-Sleep -Seconds 1
            Show-Menu
        }
    }
}

Show-Menu
