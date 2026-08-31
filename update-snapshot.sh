#!/usr/bin/env bash
# ============================================================
#  成品仓定点定位看板 · 一键更新 GitHub Pages 公网数据
#  用法：
#     bash update-snapshot.sh          # 更新并推送（推荐）
#     bash update-snapshot.sh --dry    # 只拉取+校验，不推送
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

DRY=0
[ "${1:-}" = "--dry" ] && DRY=1

SNAPSHOT="src/data/kanban-data.json"
URL="https://yubb123456.github.io/inventory-kanban/"
BACKEND="http://localhost:5174/api/data"
HEALTH="http://localhost:5174/api/health"

echo "======================================================"
echo "  成品仓定点定位看板 · 一键更新公网数据"
if [ "$DRY" = "1" ]; then echo "  模式：仅拉取+校验（--dry，不推送）"; fi
echo "======================================================"

# ---------- 1. 检查后端并拉取最新数据 ----------
echo ""
echo "[1/5] 检查后端服务..."
if curl -s -m 5 "$HEALTH" | grep -q '"ok":true'; then
  echo "      后端正常，拉取最新看板数据..."
  curl -s -m 20 "$BACKEND" -o "$SNAPSHOT"
  echo "      已写入 $SNAPSHOT"
else
  echo "      !! 警告：后端(5174)未运行，将沿用现有快照继续推送"
  echo "         （如需最新数据，请先启动后端：npm run server）"
  if [ ! -s "$SNAPSHOT" ]; then
    echo "      !! 错误：快照文件为空，无法继续"
    exit 1
  fi
fi

# ---------- 2. 校验快照数据 ----------
echo ""
echo "[2/5] 校验快照数据..."
VALID=$(python -c "
import json
try:
    d = json.load(open('$SNAPSHOT', encoding='utf-8'))
    data = d.get('data') if isinstance(d, dict) else d
    zones = data.get('zones', []) if isinstance(data, dict) else []
    total = data.get('totalItems', 0) if isinstance(data, dict) else 0
    print(f'zones={len(zones)} totalItems={total}')
except Exception as e:
    print('ERROR: ' + str(e))
" 2>&1)
if [[ "$VALID" == ERROR* ]]; then
  echo "      !! 快照数据损坏：$VALID"
  exit 1
fi
echo "      校验通过：$VALID"

# ---------- 3. 检查是否有变化 ----------
echo ""
echo "[3/5] 检查数据变化..."
if [ "$DRY" = "1" ]; then
  echo "      (dry-run) 跳过提交与推送"
  echo "======================================================"
  echo "  完成（dry-run）。快照已更新为：$VALID"
  exit 0
fi

if git status --porcelain "$SNAPSHOT" | grep -q .; then
  echo "      快照有变化，准备提交推送..."
else
  echo "      快照无变化（数据与上次相同），无需重新部署"
  echo "      当前公网页已是最新：$URL"
  exit 0
fi

# ---------- 4. 提交并推送 ----------
echo ""
echo "[4/5] 提交并推送..."
STAMP=$(date "+%Y-%m-%d %H:%M")
git add "$SNAPSHOT"
git commit -m "data: update kanban snapshot ($VALID) @ $STAMP" >/dev/null
git push origin main
echo "      已推送 main 分支，GitHub Actions 开始自动重新构建部署"

# ---------- 5. 结果提示 ----------
echo ""
echo "[5/5] 完成！"
echo "======================================================"
echo "  公网地址：$URL"
echo "  数据：$VALID"
echo "  Actions 构建约需 1-2 分钟，完成后刷新页面即可看到最新数据"
echo "======================================================"
