# 局域网多端访问配置记录

> 保存日期：2026-08-31
> 用途：让同一局域网内的手机 / 平板 / 其他电脑访问看板，数据统一写回桌面 Excel。

## 零、多端实时同步（2026-08-31 新增）
- 任一端在页面增删改后，后端经 SSE 事件流（`GET /api/events`）把最新数据实时推送给所有在线端，各端自动刷新，无需手动刷新。
- 前端启动即用 `EventSource('/api/events')` 建立长连接；Vite 代理已配置 `timeout:0 / proxyTimeout:0` 避免 SSE 长连接被断开。
- 多端并发写 Excel 已串行化（store 写队列），避免文件损坏。
- 页面头部有「实时同步 / 重连中」状态灯；连接中断会自动重连。

## 一、当前生效配置

| 项目 | 值 |
|------|-----|
| 本机局域网 IP | 192.168.21.2 |
| 前端地址 | http://192.168.21.2:5173 |
| 后端地址 | http://192.168.21.2:5174 |
| 前端 dev server | Vite，已配置 `host: true`（监听 0.0.0.0，端口 5173） |
| 后端服务 | Express，`app.listen(PORT)` 默认监听所有接口（端口 5174） |
| 数据权威源 | `C:\Users\Administrator\Desktop\成品定点定位看板.xlsx` |

## 二、局域网访问配置方式（无需改代码）

前后端均无需修改代码，配置已内置：

1. **前端**（`vite.config.js`）：`server.host: true` 表示监听所有网络接口，局域网设备可直接访问。
2. **后端**（`server/index.js`）：`app.listen(PORT)` 默认绑定 0.0.0.0，天然支持局域网访问。
3. 前端通过 Vite 代理把 `/api` 转发到本机 5174，局域网设备访问前端即可间接调用后端，无需单独配置跨域。

## 三、连接步骤

1. 本机保持前后端运行（`npm run dev:all` 或分别 `npm run server` + `npm run dev`）。
2. 其他设备连接**同一 WiFi / 局域网**。
3. 浏览器打开 `http://<本机局域网IP>:5173`（当前即 `http://192.168.21.2:5173`）。
4. 各端增删改均写回本机桌面 Excel，刷新数据一致。

## 四、IP 变更时的处理

本机 IP 是 DHCP 动态分配，换网络或重启路由器后可能变化。届时：
- 重新查看本机 IP：命令行执行 `ipconfig`，找「无线局域网适配器 / 以太网适配器」下的 IPv4 地址（当前为 192.168.21.2）。
- 把新 IP 替换上面地址中的 IP 段即可，端口 5173/5174 不变。

## 五、防火墙放行（其他设备无法访问时）

安全沙箱无法修改 Windows 防火墙（需管理员权限），需手动：

1. 「控制面板 → Windows Defender 防火墙 → 允许应用通过防火墙」。
2. 「更改设置 → 允许其他应用…」添加 Node.js 的 `node.exe`，勾选「专用」网络。
3. 或在后端/前端首次启动时弹出的防火墙提示中勾选「专用网络」并允许。

## 六、验证命令（本机自查）

```bash
curl http://192.168.21.2:5173/            # 前端应返回 200
curl http://192.168.21.2:5174/api/health  # 后端应返回 {"ok":true,"ready":true,...}
curl http://192.168.21.2:5173/api/data    # 代理链路应返回 200
```

## 六·五、后端防停（PM2 守护）

后端服务用 PM2 守护：崩溃自动重启 + 开机自启，避免手动起服务。

```bash
# 启动（进入项目目录后）
cd inventory-kanban
# 后端
pm2 start server/index.js --name kanban-server
# 前端（Windows 下须用 node 直启 vite，勿用 npm run dev）
pm2 start node --name kanban-front -- node_modules/vite/bin/vite.js

# 常用命令
pm2 list                 # 查看进程状态
pm2 logs kanban-server   # 查看日志
pm2 restart kanban-server
pm2 stop kanban-server
pm2 delete kanban-server

# 保存进程列表 + 开机自启（Windows）
pm2 save
npm i -g pm2-windows-startup && pm2-startup install
```

开机自启依赖 `pm2-startup` 注册的注册表项（HKCU Run），注册一次即可；重启电脑后 PM2 会自动 resurrect 已保存的进程列表，前后端无需手动启动。

## 七、局限与后续选项

- 依赖本机开机 + 服务运行；仅限同一局域网。
- 需随时随地访问或多人长期协作时，可迁移到金山在线表格（云文档天然多端同步）。
