/**
 * 成品仓定点定位看板 - 本地后端服务
 *
 * 提供 REST API，读写桌面《成品定点定位看板.xlsx》：
 *   GET    /api/data              获取看板数据
 *   POST   /api/item              添加商品   {zoneName, rackName, sub, code, spec}
 *   PUT    /api/item              修改商品   {sheet, row, col, code?, spec?}
 *   DELETE /api/item              删除商品   {sheet, row, col}
 *   POST   /api/item/move         移动商品   {sheet, row, col, targetZone, targetRack, targetSub}
 *   POST   /api/zone/add          新增区域   {title}
 *   POST   /api/zone/rename       重命名区域 {sheetName, newTitle}
 *   GET    /api/health            健康检查
 *
 * 启动：
 *   EXCEL_PATH="D:/xxx.xlsx" node server/index.js
 *   默认读取桌面《成品定点定位看板.xlsx》
 */
import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { ExcelStore } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Excel 路径：优先环境变量，其次命令行参数，最后默认桌面
const DEFAULT_EXCEL = path.join(os.homedir(), 'Desktop', '成品定点定位看板.xlsx')
const excelPath =
  process.env.EXCEL_PATH || process.argv[2] || (fs.existsSync(DEFAULT_EXCEL) ? DEFAULT_EXCEL : null)

if (!excelPath) {
  console.error('未找到 Excel 文件。请用 EXCEL_PATH 环境变量指定路径。')
  process.exit(1)
}
if (!fs.existsSync(excelPath)) {
  console.error(`Excel 文件不存在：${excelPath}`)
  process.exit(1)
}

const store = new ExcelStore({ excelPath })
const PORT = process.env.PORT || 5174

const app = express()
app.use(express.json())

// CORS：允许局域网内手机/平板（如安卓 APK 封装）跨域访问后端并实时写回
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// SSE 实时同步：数据变更后向所有在线客户端广播最新数据
const sseClients = new Set()
// 在线人数 = 当前 SSE 连接数（每个打开看板的设备一条连接）
function broadcastOnline() {
  const payload = `data: ${JSON.stringify({ type: 'online', online: sseClients.size })}\n\n`
  for (const client of sseClients) {
    try {
      client.write(payload)
    } catch (e) {
      sseClients.delete(client)
    }
  }
}
function broadcast() {
  const payload = `data: ${JSON.stringify({ type: 'data', data: store.getData(), online: sseClients.size })}\n\n`
  for (const client of sseClients) {
    try {
      client.write(payload)
    } catch (e) {
      sseClients.delete(client)
    }
  }
}

// 启动时加载（一次性约 20s）
const ready = store.load().then(() => {
  console.log(`[看板] Excel 已加载：${excelPath}`)
  console.log(`[看板] ${store.data.zones.length} 个区域，${store.data.totalItems} 个在库 SKU`)
})

async function withStore(req, res, fn, notify = false) {
  try {
    await ready
    const data = await fn()
    res.json({ ok: true, data })
    if (notify) broadcast()
  } catch (e) {
    console.error('[看板] 操作失败:', e.message)
    res.status(400).json({ ok: false, error: e.message })
  }
}

app.get('/api/health', async (req, res) => {
  try {
    await ready
    res.json({ ok: true, ready: store.loaded, zones: store.data.zones.length, items: store.data.totalItems })
  } catch (e) {
    res.status(500).json({ ok: false, ready: false, error: e.message })
  }
})

app.get('/api/data', (req, res) => withStore(req, res, async () => store.getData()))

// SSE 事件流：多端实时同步（数据变更推送）
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write('retry: 3000\n\n')
  sseClients.add(res)
  // 首次连接立即推送当前数据（含在线人数），并广播在线人数变化
  if (store.loaded) {
    try {
      res.write(`data: ${JSON.stringify({ type: 'data', data: store.getData(), online: sseClients.size })}\n\n`)
    } catch (e) {
      /* ignore */
    }
  }
  broadcastOnline()
  req.on('close', () => {
    sseClients.delete(res)
    broadcastOnline() // 有人下线，通知其余在线端刷新人数
  })
})

app.post('/api/item', (req, res) =>
  withStore(req, res, async () => {
    const { zoneName, rackName, sub, code, spec } = req.body || {}
    if (!zoneName || !rackName || !code) throw new Error('参数不完整：需要 zoneName、rackName、code')
    return store.addItem({ zoneName, rackName, sub, code, spec })
  }, true),
)

app.put('/api/item', (req, res) =>
  withStore(req, res, async () => {
    const { sheet, row, col, code, spec } = req.body || {}
    if (!sheet || !row || !col) throw new Error('参数不完整：需要 sheet、row、col')
    return store.updateItem({ sheet, row, col, code, spec })
  }, true),
)

app.delete('/api/item', (req, res) =>
  withStore(req, res, async () => {
    const { sheet, row, col } = req.body || {}
    if (!sheet || !row || !col) throw new Error('参数不完整：需要 sheet、row、col')
    return store.deleteItem({ sheet, row, col })
  }, true),
)

app.post('/api/item/move', (req, res) =>
  withStore(req, res, async () => {
    const { sheet, row, col, targetZone, targetRack, targetSub } = req.body || {}
    if (!sheet || !row || !col || !targetZone || !targetRack)
      throw new Error('参数不完整：需要 sheet、row、col、targetZone、targetRack')
    return store.moveItem({ sheet, row, col, targetZone, targetRack, targetSub })
  }, true),
)

// 区域管理：新增区域（新建 Excel Sheet）
app.post('/api/zone/add', (req, res) =>
  withStore(req, res, async () => {
    const { title } = req.body || {}
    if (!title) throw new Error('参数不完整：需要 title')
    return store.addZone({ title })
  }, true),
)

// 区域管理：重命名区域（重命名 Sheet + 标题行）
app.post('/api/zone/rename', (req, res) =>
  withStore(req, res, async () => {
    const { sheetName, newTitle } = req.body || {}
    if (!sheetName || !newTitle) throw new Error('参数不完整：需要 sheetName、newTitle')
    return store.renameZone({ sheetName, newTitle })
  }, true),
)


// 货架管理：重命名货架（储位与商品不变）
app.post('/api/rack/rename', (req, res) =>
  withStore(req, res, async () => {
    const { sheetName, rackName, newRackName } = req.body || {}
    if (!sheetName || !rackName || !newRackName) throw new Error('参数不完整：需要 sheetName、rackName、newRackName')
    return store.renameRack({ sheetName, rackName, newRackName })
  }, true),
)

// 货架管理：删除货架（非空需 force=true，含商品一并清掉）
app.delete('/api/rack', (req, res) =>
  withStore(req, res, async () => {
    const { sheetName, rackName } = req.body || {}
    if (!sheetName || !rackName) throw new Error('参数不完整：需要 sheetName、rackName')
    return store.deleteRack({ sheetName, rackName, force: !!(req.body && req.body.force) })
  }, true),
)

// 区域管理：删除区域（仅限空区域，防止误删有商品的区域）
app.delete('/api/zone', (req, res) =>
  withStore(req, res, async () => {
    const { sheetName } = req.body || {}
    if (!sheetName) throw new Error('参数不完整：需要 sheetName')
    return store.deleteZone({ sheetName, force: !!(req.body && req.body.force) })
  }, true),
)

app.listen(PORT, () => {
  console.log(`[看板] 后端服务已启动：http://localhost:${PORT}`)
  console.log(`[看板] 数据文件：${excelPath}`)
  console.log('[看板] 正在加载 Excel（首次约 20 秒，请稍候）...')
})
