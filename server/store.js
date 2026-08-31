/**
 * ExcelStore —— 成品定点定位看板数据存储层
 *
 * 职责：
 *   1. 启动时用 exceljs 将 Excel 一次性加载进内存（一次性耗时约 20s，可接受）
 *   2. 从内存 Workbook 解析出看板 JSON + 商品位置索引（每个商品对应 sheet/row/col）
 *   3. 提供增/删/改/移 方法，操作内存后保存回 Excel 文件，再重新解析
 *
 * 解析模型（归属 + 区域）：
 *   - 每个 Sheet 是一个区域；每 2 列（编码+规格）为一列组，共 4 个列组
 *   - 货架标签行（如"成品一区1-1""阁楼A货架"）定义列组归属货架
 *   - 子标签行（左/右/前/后、A1层）细分储位
 *   - 每个列组在某归属下有一段"可写区域"；归属变化时关闭该区域：
 *       - 有商品 → 注册数据段（含每个商品精确 row/col）
 *       - 无商品 → 注册空段（供"添加"定位空行）
 *   - 空货架/空储位在 zone 视图中保留（slots 为空数组），与 Excel 布局一致
 */
import ExcelJS from 'exceljs'

const CODE_RE = /^\d{2}\.\d{2}\.\d{2}\.\d{4}/
const COL_STARTS = [1, 3, 5, 7] // 4 个列组的起始列（1-based）

function cellText(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((t) => t.text).join('').trim()
    if (v.result != null) return String(v.result).trim()
    if (v.text != null) return String(v.text).trim()
    return ''
  }
  return String(v).trim()
}

export class ExcelStore {
  constructor({ excelPath }) {
    this.excelPath = excelPath
    this.wb = null
    this.data = { zones: [], totalItems: 0 }
    // 写队列：多端并发写 Excel 时串行化，避免文件损坏
    this._writeQueue = Promise.resolve()
    // 位置索引：key: sheet::rackName::sub -> [{sheet, col, startRow, endRow, items:[{row, code, spec}]}]
    this.slotSegments = new Map()
    // 货架标签单元格索引：key `sheet::rackName` -> {row, col}
    this.rackLabelCells = new Map()
    this.loaded = false
  }

  async load() {
    this.wb = new ExcelJS.Workbook()
    await this.wb.xlsx.readFile(this.excelPath)
    this.parse()
    this.loaded = true
  }

  async save() {
    // 串行化：同一时刻只允许一次写盘+重解析
    const task = this._writeQueue.then(async () => {
      await this.wb.xlsx.writeFile(this.excelPath)
      this.parse()
    })
    this._writeQueue = task.catch(() => {})
    return task
  }

  getData() {
    return this.data
  }

  /* ===================== 解析 ===================== */

  parse() {
    const zones = []
    const slotSegments = new Map()
    this.rackLabelCells = new Map()
    let totalItems = 0

    const pushSegment = (sheet, colIdx, ctx, seg) => {
      const key = `${sheet}::${ctx.rackName}::${ctx.sub || ''}`
      if (!slotSegments.has(key)) slotSegments.set(key, [])
      slotSegments.get(key).push({
        sheet,
        col: COL_STARTS[colIdx],
        startRow: seg.startRow,
        endRow: seg.endRow,
        items: seg.items,
      })
    }

    this.wb.eachSheet((ws) => {
      const sheetName = ws.name
      const maxRow = ws.rowCount
      const maxCol = Math.min(ws.columnCount, 8)

      const readCell = (r, c) => cellText(ws.getCell(r, c).value)

      let zoneTitle = sheetName
      let curCtx = {} // colIdx -> {rackName, sub}
      let regionStart = {} // colIdx -> 当前归属可写起始行
      let openItems = {} // colIdx -> items[]

      // 关闭某列组当前归属区域
      const closeRegion = (colIdx, endRow) => {
        const ctx = curCtx[colIdx]
        const start = regionStart[colIdx]
        if (!ctx || start == null) return
        const items = openItems[colIdx] || []
        if (items.length) {
          pushSegment(sheetName, colIdx, ctx, {
            startRow: start,
            endRow: Math.max(endRow, start - 1),
            items,
          })
        } else if (endRow >= start) {
          // 空储位也注册区域，供"添加"定位空行
          pushSegment(sheetName, colIdx, ctx, {
            startRow: start,
            endRow,
            items: [],
          })
        }
        delete regionStart[colIdx]
        delete openItems[colIdx]
      }

      // 重置所有列组归属（货架标签行调用）
      const resetAll = (startRow) => {
        for (let gi = 0; gi < 4; gi++) closeRegion(gi, startRow - 1)
        for (let gi = 0; gi < 4; gi++) {
          delete curCtx[gi]
          delete regionStart[gi]
          delete openItems[gi]
        }
      }

      for (let r = 1; r <= maxRow; r++) {
        const vals = []
        for (let c = 1; c <= maxCol; c++) vals.push(readCell(r, c))
        const nonempty = []
        for (let i = 0; i < vals.length; i++) if (vals[i]) nonempty.push([i, vals[i]])
        if (!nonempty.length) continue
        const texts = nonempty.map(([, t]) => t)

        // 总看板标题
        if (texts.some((t) => t.includes('定点定位看板'))) continue

        // 表头行
        if (texts.some((t) => t.includes('编码'))) continue

        // 区域标题行（区域标题固定在第 1-2 行；同名字符串在更后面的行是货架标签，不能误判）
        if (
          nonempty.length === 1 &&
          r <= 2 &&
          (texts[0] === sheetName ||
            ((texts[0].endsWith('区') || texts[0].endsWith('楼') || texts[0].endsWith('仓')) &&
              !['货架', '矩阵', '编号'].some((k) => texts[0].includes(k))))
        ) {
          zoneTitle = texts[0]
          continue
        }

        // 数据行
        const hasCode = texts.some((t) => CODE_RE.test(t))
        if (hasCode) {
          for (let i = 0; i < vals.length; i++) {
            if (i % 2 === 0 && vals[i] && CODE_RE.test(vals[i])) {
              const colIdx = i / 2
              if (!curCtx[colIdx]) {
                // 无货架覆盖：兜底到区域名
                curCtx[colIdx] = { rackName: zoneTitle, sub: '' }
              }
              if (regionStart[colIdx] == null) regionStart[colIdx] = r
              if (!openItems[colIdx]) openItems[colIdx] = []
              const spec = vals[i + 1] || null
              openItems[colIdx].push({ row: r, code: vals[i], spec })
              totalItems++
            }
          }
          continue
        }

        // 子标签行
        const isSublabel =
          texts.length > 0 &&
          texts.every((t) => ['左', '右', '前', '后'].includes(t) || t.endsWith('层'))
        if (isSublabel) {
          const labelCols = {}
          for (let i = 0; i < vals.length; i++) if (i % 2 === 0 && vals[i]) labelCols[i] = vals[i]
          const sorted = Object.keys(labelCols).map(Number).sort((a, b) => a - b)
          for (let gi = 0; gi < 4; gi++) {
            let owner = null
            for (const si of sorted) if (si / 2 <= gi) owner = si
            if (owner != null && curCtx[gi]) {
              const newSub = labelCols[owner]
              if ((curCtx[gi].sub || '') !== newSub) {
                // 子标签变化：关闭旧区域，开启新区域
                closeRegion(gi, r - 1)
                curCtx[gi].sub = newSub
                regionStart[gi] = r + 1
                openItems[gi] = []
              }
            }
          }
          continue
        }

        // 货架标签行
        const labelCols = {}
        for (let i = 0; i < vals.length; i++) if (i % 2 === 0 && vals[i]) labelCols[i] = vals[i]
        if (Object.keys(labelCols).length) {
          // 记录货架标签单元格（一个货架名可能占多列，取首个）
          for (const [ci, rn] of Object.entries(labelCols)) {
            const key = `${sheetName}::${rn}`
            if (!this.rackLabelCells.has(key)) this.rackLabelCells.set(key, { row: r, col: Number(ci) + 1 })
          }
          resetAll(r)
          const sorted = Object.keys(labelCols).map(Number).sort((a, b) => a - b)
          for (let gi = 0; gi < 4; gi++) {
            let owner = null
            for (const si of sorted) if (si / 2 <= gi) owner = si
            const rname = owner != null ? labelCols[owner] : null
            if (rname) {
              curCtx[gi] = { rackName: rname, sub: '' }
              regionStart[gi] = r + 1
              openItems[gi] = []
            }
          }
          continue
        }
      }
      // 收尾：关闭所有区域
      for (let gi = 0; gi < 4; gi++) closeRegion(gi, maxRow)

      // 组装 zone 视图（按货架名聚合）
      const zoneRacksMap = new Map()
      for (const [key, segs] of slotSegments.entries()) {
        if (!key.startsWith(sheetName + '::')) continue
        const parts = key.split('::')
        const rackName = parts[1] ?? ''
        const sub = parts.slice(2).join('::') ?? ''
        let rack = zoneRacksMap.get(rackName)
        if (!rack) {
          rack = { name: rackName, slotMap: {} }
          zoneRacksMap.set(rackName, rack)
        }
        if (!rack.slotMap[sub]) rack.slotMap[sub] = []
        for (const seg of segs) {
          for (const it of seg.items) {
            rack.slotMap[sub].push({
              code: it.code,
              spec: it.spec,
              pos: { sheet: sheetName, row: it.row, col: seg.col },
            })
          }
        }
      }

      const zoneRacks = []
      for (const rack of zoneRacksMap.values()) {
        const slots = Object.entries(rack.slotMap)
          .map(([sub, items]) => ({ sub, items }))
          .sort(
            (a, b) =>
              (a.sub === '' ? -1 : 1) - (b.sub === '' ? -1 : 1) ||
              a.sub.localeCompare(b.sub, 'zh-CN'),
          )
        zoneRacks.push({ name: rack.name, slots })
      }
      if (zoneRacks.length) zones.push({ name: sheetName, title: zoneTitle, racks: zoneRacks })
    })

    this.slotSegments = slotSegments
    this.data = { zones, totalItems }
  }

  /* ===================== 辅助 ===================== */

  _findSegment(zoneName, rackName, sub) {
    const key = `${zoneName}::${rackName}::${sub || ''}`
    return this.slotSegments.get(key) || []
  }

  _findEmptyRow(segs) {
    for (const seg of segs) {
      const ws = this.wb.getWorksheet(seg.sheet)
      for (let r = seg.startRow; r <= seg.endRow; r++) {
        if (!cellText(ws.getCell(r, seg.col).value) && !cellText(ws.getCell(r, seg.col + 1).value)) {
          return { sheet: seg.sheet, row: r, col: seg.col }
        }
      }
    }
    return null
  }

  _writeCell(sheet, row, col, value) {
    this.wb.getWorksheet(sheet).getCell(row, col).value = value
  }

  /* ===================== CRUD ===================== */

  async addItem({ zoneName, rackName, sub, code, spec }) {
    const segs = this._findSegment(zoneName, rackName, sub)
    if (!segs.length) throw new Error(`未找到储位 ${zoneName}/${rackName}/${sub || '(默认)'}`)
    const target = this._findEmptyRow(segs)
    if (!target) throw new Error(`储位 ${rackName}${sub ? '/' + sub : ''} 已满，无空行`)
    this._writeCell(target.sheet, target.row, target.col, code)
    this._writeCell(target.sheet, target.row, target.col + 1, spec || '')
    await this.save()
    return this.data
  }

  async updateItem({ sheet, row, col, code, spec }) {
    if (!sheet || !row || !col) throw new Error('缺少商品位置信息')
    if (code != null) this._writeCell(sheet, row, col, code)
    if (spec != null) this._writeCell(sheet, row, col + 1, spec)
    await this.save()
    return this.data
  }

  async deleteItem({ sheet, row, col }) {
    if (!sheet || !row || !col) throw new Error('缺少商品位置信息')
    this._writeCell(sheet, row, col, null)
    this._writeCell(sheet, row, col + 1, null)
    await this.save()
    return this.data
  }

  /* ===================== 区域管理 ===================== */

  async addZone({ title }) {
    const name = (title || '').trim()
    if (!name) throw new Error('区域名称不能为空')
    if (this.wb.getWorksheet(name)) throw new Error(`区域「${name}」已存在`)
    const ws = this.wb.addWorksheet(name)
    // 第 1 行总看板标题（解析时跳过）
    ws.getCell(1, 1).value = '成品仓定点定位看板'
    // 第 2 行区域标题
    ws.getCell(2, 1).value = name
    // 第 3 行默认货架标签（让新区域有可添加储位的货架）
    ws.getCell(3, 1).value = `${name}货架`
    // 第 4 行表头：4 组 编码/规格型号
    for (let gi = 0; gi < 4; gi++) {
      ws.getCell(4, COL_STARTS[gi]).value = '编码'
      ws.getCell(4, COL_STARTS[gi] + 1).value = '规格型号'
    }
    await this.save()
    return this.data
  }

  async renameZone({ sheetName, newTitle }) {
    const name = (newTitle || '').trim()
    if (!name) throw new Error('区域名称不能为空')
    if (this.wb.getWorksheet(name)) throw new Error(`区域「${name}」已存在`)
    const ws = this.wb.getWorksheet(sheetName)
    if (!ws) throw new Error(`未找到区域 ${sheetName}`)
    // 重命名 Sheet（区域名 = Sheet 名）并同步标题行
    ws.name = name
    ws.getCell(2, 1).value = name
    await this.save()
    return this.data
  }

  async deleteZone({ sheetName, force = false }) {
    if (!sheetName) throw new Error('参数不完整：需要 sheetName')
    const ws = this.wb.getWorksheet(sheetName)
    if (!ws) throw new Error(`未找到区域 ${sheetName}`)
    // 该区域下商品数量（防止误删有数据的区域）
    const items = this.data.zones.find((z) => z.name === sheetName)
    const count = items ? items.racks.reduce((s, r) => s + r.slots.reduce((x, sl) => x + sl.items.length, 0), 0) : 0
    if (count > 0 && !force) throw new Error(`区域「${sheetName}」仍包含 ${count} 个商品，请先清空后再删除`)
    this.wb.removeWorksheet(ws.id)
    await this.save()
    return this.data
  }

  /* ===================== 货架管理 ===================== */

  _findRackLabel(sheetName, rackName) {
    return this.rackLabelCells.get(`${sheetName}::${rackName}`) || null
  }

  _rackItemCount(sheetName, rackName) {
    let n = 0
    for (const [key, segs] of this.slotSegments.entries()) {
      if (!key.startsWith(`${sheetName}::${rackName}`)) continue
      for (const seg of segs) n += seg.items.length
    }
    return n
  }

  /** 货架改名：修改货架标签单元格文本，储位与商品保持不变 */
  async renameRack({ sheetName, rackName, newRackName }) {
    const name = (newRackName || '').trim()
    if (!name) throw new Error('货架名称不能为空')
    if (name === rackName) return this.data
    const label = this._findRackLabel(sheetName, rackName)
    if (!label) throw new Error(`未找到货架 ${sheetName}/${rackName}`)
    // 同区域内查重
    for (const [key] of this.rackLabelCells.entries()) {
      if (key === `${sheetName}::${name}`) throw new Error(`区域「${sheetName}」下已有货架「${name}」`)
    }
    const ws = this.wb.getWorksheet(sheetName)
    ws.getCell(label.row, label.col).value = name
    await this.save()
    return this.data
  }

  /** 货架删除：清除该货架覆盖列组的全部数据与标签（非空需 force） */
  async deleteRack({ sheetName, rackName, force = false }) {
    if (!sheetName || !rackName) throw new Error('参数不完整：需要 sheetName 和 rackName')
    const label = this._findRackLabel(sheetName, rackName)
    if (!label) throw new Error(`未找到货架 ${sheetName}/${rackName}`)
    const count = this._rackItemCount(sheetName, rackName)
    if (count > 0 && !force) throw new Error(`货架「${rackName}」仍包含 ${count} 个商品，请先清空后再删除`)
    const ws = this.wb.getWorksheet(sheetName)
    // 清除该货架覆盖列组的全部单元格（含商品与空储位范围）
    const cleared = new Set()
    for (const [key, segs] of this.slotSegments.entries()) {
      if (!key.startsWith(`${sheetName}::${rackName}`)) continue
      for (const seg of segs) {
        for (let r = seg.startRow; r <= seg.endRow; r++) {
          const cellKey = `${seg.col}|${r}`
          if (cleared.has(cellKey)) continue
          cleared.add(cellKey)
          ws.getCell(r, seg.col).value = null
          ws.getCell(r, seg.col + 1).value = null
        }
      }
    }
    // 清除货架标签单元格
    ws.getCell(label.row, label.col).value = null
    await this.save()
    return this.data
  }

  async moveItem({ sheet, row, col, targetZone, targetRack, targetSub }) {
    const ws = this.wb.getWorksheet(sheet)
    const code = cellText(ws.getCell(row, col).value)
    const spec = cellText(ws.getCell(row, col + 1).value)
    if (!code) throw new Error('原位置无商品')
    this._writeCell(sheet, row, col, null)
    this._writeCell(sheet, row, col + 1, null)
    const segs = this._findSegment(targetZone, targetRack, targetSub)
    if (!segs.length) throw new Error(`未找到目标储位 ${targetZone}/${targetRack}/${targetSub}`)
    const target = this._findEmptyRow(segs)
    if (!target) throw new Error(`目标储位 ${targetRack} 已满`)
    this._writeCell(target.sheet, target.row, target.col, code)
    this._writeCell(target.sheet, target.row, target.col + 1, spec || '')
    await this.save()
    return this.data
  }
}
