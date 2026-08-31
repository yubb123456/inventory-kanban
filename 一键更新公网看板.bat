@echo off
rem ============================================================
rem  成品仓定点定位看板 · 一键更新 GitHub Pages 公网数据
rem  双击本文件即可运行（需已安装 Git for Windows）
rem ============================================================
cd /d "%~dp0"

where bash >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 Git Bash，请先安装 Git for Windows：https://git-scm.com
    pause
    exit /b 1
)

echo ======================================================
echo   一键更新公网看板数据
echo   将拉取最新数据并推送到 GitHub，自动重新部署
echo ======================================================
echo.

bash update-snapshot.sh %*

echo.
echo 按任意键关闭窗口...
pause >nul
