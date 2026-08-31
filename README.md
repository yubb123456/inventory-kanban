# 成品仓定点定位看板

将《成品定点定位看板.xlsx》还原为网页版储位看板：按区域/货架/储位查看每个储位存放的商品（编码+规格型号），支持按编码或型号搜索定位到具体储位，支持在页面增删改商品并**实时写回桌面 Excel**，支持局域网内多端访问，任一端修改后**所有在线端实时同步**（无需刷新）。

## 快速开始

### 环境要求
- Node.js 18+（含 npm）

### 安装依赖
```bash
npm install
```

### 启动（开发模式）
```bash
npm run dev:all
```
- 前端 dev server：http://localhost:5173（Vite，自动热更新）
- 后端服务：http://localhost:5174（Express + exceljs，启动时加载 Excel 约 20 秒）
- 前端通过 Vite 代理把 `/api` 转发到后端 5174，无需单独配置跨域

浏览器访问 http://localhost:5173 即可使用看板。

### 分步启动（需要分别开两个终端）
```bash
# 终端 1：后端
npm run server
# 终端 2：前端
npm run dev
```

### 构建静态文件
```bash
npm run build
```
构建产物输出到 `dist/` 目录，可部署到任意静态服务器（此时后端仍需单独运行）。

## 多端实时同步

任一端（电脑/手机/平板）在页面增删改商品后，后端通过 **SSE（Server-Sent Events）** 把最新数据实时推送给所有在线端，各端界面自动更新，无需手动刷新。

- 前端启动时通过 `EventSource('/api/events')` 建立长连接，收到推送后自动刷新看板。
- 页面上方「实时同步」绿色指示表示连接正常；橙色「重连中」表示连接中断（会自动重连）。
- 数据变更 → 后端广播 → 各端实时刷新，写回 Excel 与多端推送同步完成。

## 多端数据同步（局域网访问）

看板前后端均已监听所有网络接口（`host: true`），同一局域网（同一 WiFi/网线）下的手机、平板、其他电脑均可访问。

1. 确认运行本看板的电脑与本机在同一网络。
2. 获取本机局域网 IP（例如 `192.168.21.2`），其他设备浏览器打开：
   ```
   http://<本机局域网IP>:5173
   ```
3. 其他设备在页面上做的增删改，同样会写回本机桌面的 Excel 文件，各端看到的数据一致。

### 如果其他设备无法访问（防火墙）
Windows 防火墙可能拦截入站连接，需要放行 Node.js：

1. 打开「控制面板 → Windows Defender 防火墙 → 允许应用通过防火墙」。
2. 点击「更改设置 → 允许其他应用…」，添加 Node.js 的安装路径（`node.exe`），并勾选「专用」网络。
3. 或在首次启动后端/前端时弹出的防火墙提示中勾选「专用网络」并允许访问。

> 说明：局域网方案依赖本机开机并保持看板服务运行；若要随时随地访问或多人长期协作，可考虑迁移到金山在线表格（云文档天然多端同步）。

## 服务守护（PM2，防止服务意外停止）

看板前后端均可用 PM2 托管：崩溃自动重启 + 开机自启，避免服务意外停止后看板打不开。

```bash
cd inventory-kanban
# 后端
pm2 start server/index.js --name kanban-server
# 前端（Windows 下须用 node 直启 vite，勿用 npm run dev，否则会因 .cmd 解释失败退出）
pm2 start node --name kanban-front -- node_modules/vite/bin/vite.js

# 保存进程列表 + 注册开机自启（Windows 注册表 HKCU Run）
pm2 save
npm i -g pm2-windows-startup && pm2-startup install
```

- `pm2 list` 查看状态；`pm2 logs <name>` 查看日志；`pm2 restart/stop <name>` 重启/停止。
- 开机自启注册一次即可：重启电脑后 PM2 自动 resurrect 已保存的进程，前后端无需手动启动。
- 崩溃自动重启已验证：强制杀掉后端进程后，PM2 数秒内自动拉起新进程并重新监听 5174。

## GitHub Pages 公网部署（静态快照，仅供查看）

看板已部署到 GitHub Pages：**https://yubb123456.github.io/inventory-kanban/**

- **数据**：部署的是打包时的静态快照（`src/data/kanban-data.json`，当前 10 区域 / 1508 SKU），页面打开即为快照内容。
- **能力**：公网页为「仅供查看」——前端自动降级到静态快照并隐藏管理模式/新增/重命名/删除等编辑入口，顶部显示蓝色「静态快照」标识。
- **更新数据**：重新生成快照后推送到仓库，GitHub Actions 会自动重新构建部署：
  1. 后端运行时执行 `curl http://localhost:5174/api/data -o src/data/kanban-data.json`
  2. `git add src/data/kanban-data.json && git commit -m "update snapshot" && git push`
  3. 等 Actions 跑完（约 1-2 分钟）后刷新公网页面
- **技术**：`.github/workflows/deploy.yml` 在 push 到 main 时自动 `npm ci && npm run build` 并用 `actions/deploy-pages` 发布 `dist/`。
- 注意：公网页与局域网版本是两套访问方式，互不影响；局域网版仍实时写回 Excel。

## 数据说明
- 数据来源于《成品定点定位看板.xlsx》：10 个区域，1508 个在库 SKU。
- Excel 文件是本看板的**唯一权威数据源**：后端启动时一次性加载进内存，页面的增删改直接改内存并写回 Excel。
- 写回会保留原有格式：合并单元格（16481 个）、行高列宽、样式均保持一致。

## 如何维护数据

### 方式一：在页面维护（推荐日常使用）
点击右上角「管理模式」开关，即可在页面上对储位商品进行：
- **添加**：为某个储位新增商品
- **修改**：改商品编码 / 规格 / 储位归属
- **删除**：移除商品
- **移动**：把商品调整到其他货架/储位

所有操作实时写回桌面 Excel，刷新页面数据保持一致。

### 仓库区域管理（新增 / 重命名）
展开「仓库区域」面板后：
- **新增区域**：点击区域标签栏右侧的「＋ 新增区域」，输入区域名称，会在 Excel 新增一个工作表（含区域标题、默认货架、编码/规格表头），随后可在该区域添加商品。
- **重命名区域**：点击某区域标题旁的「重命名」，输入新名称，会同步重命名 Excel 工作表与标题行，该区域下的货架与储位保持不变。
- **删除区域**：点击某区域标题旁的「删除」，可移除不需要的区域（如误建的或测试用的空区域）。**仅空区域可删除**——若区域仍包含商品会提示先清空，防止误删数据。删除后该 Excel 工作表一并移除。

区域管理同样实时写回 Excel，并经 SSE 推送给所有在线端。

### 方式二：更新 Excel 后重新加载
1. 在原《成品定点定位看板.xlsx》上维护库存（保持原表格式：每个 Sheet 一个区域、每 2 列一组储位、货架标签行为储位归属、"左/右/层"为细分）。
2. **重启后端服务**（`npm run server`），重新加载 Excel 生效。

### 方式三：离线解析脚本（不改架构时预览）
```bash
python scripts/parse_excel.py "库存文件路径.xlsx" src/data/kanban.json
```

## 技术栈与架构
- 前端：React 18 + Vite 5 + Tailwind CSS 3
- 后端：Node.js + Express + exceljs
- 数据：桌面 Excel（读写保真，合并单元格/样式完整保留）
- 实时同步：SSE（Server-Sent Events），`GET /api/events` 事件流广播最新数据

```
设备A ──┐                    ┌── 写回 ──► 桌面 Excel
设备B ──┼── http://IP:5173 ──┼─► Express(5174) ──┼── SSE 广播 ──► 设备A/B/C 实时刷新
设备C ──┘                    │
                          内存数据（启动时加载）
```

```
inventory-kanban/
├── src/
│   ├── components/       # 搜索栏、区域Tab、货架卡片、储位分区、编辑弹窗
│   ├── data/kanban.json  # 解析出的静态快照（供参考）
│   ├── api.js            # 后端 API 封装
│   ├── App.jsx           # 主应用（浏览/搜索/管理模式）
│   └── index.css         # 全局样式
├── server/
│   ├── index.js          # Express 入口（端口 PORT 可配）
│   └── store.js          # Excel 解析 + 位置索引 + CRUD 写回
├── scripts/
│   ├── parse_excel.py    # Excel → JSON 解析脚本
│   ├── verify_exceljs.js # exceljs 保真验证脚本
│   └── timing_test.js    # 读写性能计时脚本
├── index.html
├── vite.config.js
└── tailwind.config.js
```

## 常用环境变量
- `PORT`：后端端口（默认 5174）
- `EXCEL_PATH`：Excel 文件路径（默认桌面《成品定点定位看板.xlsx》）
