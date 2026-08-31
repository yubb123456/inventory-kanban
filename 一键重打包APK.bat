@echo off
rem ============================================================
rem  成品仓定位看板 · 一键重打包安卓 APK
rem  双击本文件即可运行（需已安装 Git for Windows 与 Python）
rem  自动读取公网隧道/局域网地址并重新构建 APK，复制到桌面
rem ============================================================
cd /d "%~dp0"

where bash >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 Git Bash，请先安装 Git for Windows：https://git-scm.com
    pause
    exit /b 1
)
where python >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3。
    pause
    exit /b 1
)

echo ======================================================
echo   一键重打包 APK
echo   自动读取公网隧道地址（或局域网 IP）构建新 APK
echo   结果保存到桌面
echo ======================================================
echo.

bash repack-apk.sh %*

echo.
echo 按任意键关闭窗口...
pause >nul
