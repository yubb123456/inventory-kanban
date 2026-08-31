#!/usr/bin/env bash
# ============================================================
#  成品仓定位看板 · 一键重打包安卓 APK
#  自动读取当前公网隧道地址（或局域网 IP）-> 构建 -> 同步 -> 打包
#  适用于：换了网络/IP、隧道地址变化后重新打包给手机安装
#  用法：双击「一键重打包APK.bat」，或 `bash repack-apk.sh [地址]`
# ============================================================
set -u

# ---------- 路径 ----------
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 工具链绝对路径（相对工作区稳定）
TOOLCHAIN="/c/Users/Administrator/Documents/lingxi-claw/20260831-09-40-13-249/android-toolchain"
JDK="$TOOLCHAIN/jdk-21.0.6+7"
SDK="$TOOLCHAIN/sdk"
DESKTOP="/c/Users/Administrator/Desktop"
OUTPUT="/c/Users/Administrator/Documents/lingxi-claw/20260831-09-40-13-249/output"
APK_REL="android/app/build/outputs/apk/debug/app-debug.apk"

cd "$BASE_DIR" || { echo "[错误] 无法进入项目目录"; exit 1; }
mkdir -p .repack-log

# ---------- 校验工具链 ----------
echo "======================================================"
echo "  成品仓定位看板 · 一键重打包 APK"
echo "======================================================"
echo ""
if [ ! -x "$JDK/bin/java.exe" ]; then
  echo "[错误] 未找到 JDK 21：$JDK"
  echo "      请确认 android-toolchain 目录完整（JDK21 + Android SDK）。"
  exit 1
fi
if [ ! -d "$SDK/platform-tools" ] || [ ! -d "$SDK/platforms/android-34" ]; then
  echo "[错误] 未找到 Android SDK（platform-tools / android-34）。"
  exit 1
fi
if [ ! -d "$BASE_DIR/android" ]; then
  echo "[错误] 未找到 android 工程，请先在本机执行过 npx cap add android。"
  exit 1
fi

# ---------- 确定后端地址（公网隧道优先，局域网 IP 兜底） ----------
# 从 PM2 的 kanban-tunnel 日志自动读取当前公网隧道地址
TUNNEL_URL=""
if command -v pm2 >/dev/null 2>&1 && pm2 describe kanban-tunnel >/dev/null 2>&1; then
  PM2_ERR="$HOME/.pm2/logs/kanban-tunnel-error.log"
  if [ -f "$PM2_ERR" ]; then
    TUNNEL_URL="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$PM2_ERR" | tail -1)"
  fi
fi

# 局域网 IP（兜底用）
LAN_IP="$(python scripts/get_lan_ip.py 2>/dev/null | tr -d '\r')"
if [ -z "$LAN_IP" ] || [ "$LAN_IP" = "127.0.0.1" ]; then
  LAN_IP="192.168.21.2"
fi

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  if [ -n "$TUNNEL_URL" ]; then
    echo "检测到当前公网隧道：$TUNNEL_URL"
    echo "（手机任意网络都能连，数据实时写回桌面 Excel）"
  else
    echo "未检测到公网隧道，将使用局域网模式。"
    echo "检测到本机局域网 IP：$LAN_IP（http://$LAN_IP:5174）"
  fi
  echo -n "请输入后端完整地址（直接回车用上面检测值）："
  read -r INPUT
  if [ -n "$INPUT" ]; then
    TARGET="$INPUT"
  elif [ -n "$TUNNEL_URL" ]; then
    TARGET="$TUNNEL_URL"
  else
    TARGET="http://$LAN_IP:5174"
  fi
fi
# 规范：若只输入 IP（无 http 前缀）且非域名，按局域网 IP:5174 处理
case "$TARGET" in
  http://*|https://*) : ;;
  *.*.*.*) TARGET="http://$TARGET:5174" ;;   # 形如 192.168.x.x 纯 IP
  *) : ;;
esac
echo "→ 后端地址设为：$TARGET"
echo ""

export JAVA_HOME="$(cygpath -w "$JDK")"
export ANDROID_HOME="$(cygpath -w "$SDK")"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JDK/bin:$PATH"

# ---------- 1. 构建前端（注入后端地址） ----------
echo "[1/4] 构建前端（注入后端地址）..."
if ! VITE_API_BASE="$TARGET" npm run build >"$BASE_DIR/.repack-log/repack-build.log" 2>&1; then
  echo "[错误] 前端构建失败，日志："
  tail -20 "$BASE_DIR/.repack-log/repack-build.log"
  exit 1
fi
echo "      ✓ 前端构建完成"

# ---------- 2. 同步 Capacitor 安卓工程 ----------
echo "[2/4] 同步 Capacitor 安卓工程..."
if ! npx cap sync android >"$BASE_DIR/.repack-log/repack-sync.log" 2>&1; then
  echo "[错误] cap sync 失败，日志："
  tail -20 "$BASE_DIR/.repack-log/repack-sync.log"
  exit 1
fi
echo "      ✓ 同步完成"

# ---------- 3. Gradle 打包 APK ----------
echo "[3/4] Gradle 编译 APK（约 1-2 分钟，请耐心等待）..."
cd "$BASE_DIR/android" || exit 1
if ! ./gradlew.bat assembleDebug --no-daemon >"$BASE_DIR/.repack-log/repack-gradle.log" 2>&1; then
  echo "[错误] Gradle 打包失败，日志末尾："
  tail -30 "$BASE_DIR/.repack-log/repack-gradle.log"
  exit 1
fi
cd "$BASE_DIR"
echo "      ✓ APK 编译成功"

# ---------- 4. 复制 APK 到桌面与工作区 ----------
echo "[4/4] 复制 APK 到桌面与工作区..."
mkdir -p "$OUTPUT"
if ! cp "$APK_REL" "$OUTPUT/成品仓定位看板.apk"; then
  echo "[错误] APK 复制失败，请检查 $APK_REL 是否存在。"
  exit 1
fi
cp "$OUTPUT/成品仓定位看板.apk" "$DESKTOP/成品仓定位看板.apk"
echo ""

echo "======================================================"
echo "  打包完成！"
echo "  新 APK 已保存到："
echo "    $DESKTOP/成品仓定位看板.apk"
echo "  后端地址：$TARGET"
echo "  提示：公网隧道模式下手机任意网络可连；"
echo "        局域网模式下需与电脑同一 WiFi。"
echo "======================================================"
