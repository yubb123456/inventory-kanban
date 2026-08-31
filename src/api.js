/**
 * 看板后端 API 封装
 * 所有写操作都会同步写回桌面 Excel 文件
 */

// 后端 API 地址：
// - 网页版：默认 /api（经 Vite 代理转发到本机 5174）
// - 安卓 APK：构建时用 VITE_API_BASE 指定局域网后端，如 http://192.168.21.2:5174
const BASE = import.meta.env.VITE_API_BASE || '/api'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json().catch(() => ({ ok: false, error: '响应解析失败' }))
  if (!json.ok) {
    throw new Error(json.error || `请求失败 (${res.status})`)
  }
  return json.data
}

export const api = {
  /** 获取看板数据（区域/货架/储位/商品） */
  async getData() {
    const data = await request('/data')
    return data
  },

  /** 添加商品到指定储位 */
  async addItem({ zoneName, rackName, sub, code, spec }) {
    return request('/item', {
      method: 'POST',
      body: JSON.stringify({ zoneName, rackName, sub, code, spec }),
    })
  },

  /** 修改商品（编码/型号） */
  async updateItem({ sheet, row, col, code, spec }) {
    return request('/item', {
      method: 'PUT',
      body: JSON.stringify({ sheet, row, col, code, spec }),
    })
  },

  /** 删除商品 */
  async deleteItem({ sheet, row, col }) {
    return request('/item', {
      method: 'DELETE',
      body: JSON.stringify({ sheet, row, col }),
    })
  },

  /** 移动商品到其他储位（修改归属） */
  async moveItem({ sheet, row, col, targetZone, targetRack, targetSub }) {
    return request('/item/move', {
      method: 'POST',
      body: JSON.stringify({ sheet, row, col, targetZone, targetRack, targetSub }),
    })
  },

  /** 新增仓库区域（新建 Excel Sheet） */
  async addZone(title) {
    return request('/zone/add', {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
  },

  /** 重命名仓库区域（重命名 Excel Sheet 与标题行） */
  async renameZone(sheetName, newTitle) {
    return request('/zone/rename', {
      method: 'POST',
      body: JSON.stringify({ sheetName, newTitle }),
    })
  },

  /** 删除仓库区域（仅限空区域，非空区域会报错防止误删） */
  async deleteZone(sheetName) {
    return request('/zone', {
      method: 'DELETE',
      body: JSON.stringify({ sheetName }),
    })
  },

  /** 货架改名（储位与商品不变） */
  async renameRack(sheetName, rackName, newRackName) {
    return request('/rack/rename', {
      method: 'POST',
      body: JSON.stringify({ sheetName, rackName, newRackName }),
    })
  },

  /** 删除货架（非空货架需 force=true，含商品一并清掉） */
  async deleteRack(sheetName, rackName, force = false) {
    return request('/rack', {
      method: 'DELETE',
      body: JSON.stringify({ sheetName, rackName, force }),
    })
  },
}
