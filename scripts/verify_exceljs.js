/* eslint-disable no-console */
// 验证 exceljs 读写 Excel 的布局保真性：
// 1. 读取原表 2. 统计合并单元格/样式 3. 修改一个商品单元格 4. 保存副本 5. 重新解析对比
import ExcelJS from 'exceljs'

const SRC = 'C:/Users/Administrator/Desktop/成品定点定位看板.xlsx'
const DST = 'C:/Users/Administrator/Documents/lingxi-claw/20260831-09-40-13-249/verify-output.xlsx'

async function main() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(SRC)
  console.log('工作表列表:', wb.worksheets.map((w) => w.name))

  // 统计合并单元格数量
  let totalMerged = 0
  wb.eachSheet((ws) => {
    const names = Object.keys(ws._merges || {}).length
    totalMerged += names
  })
  console.log('全部合并单元格总数:', totalMerged)

  // 取成品一区，定位第一个商品 19.01.13.0018 所在单元格，读取其行高/样式等
  const ws = wb.getWorksheet('成品一区')
  console.log('成品一区 maxRow:', ws.rowCount, 'maxCol:', ws.columnCount)

  // 读某一行合并信息
  const row3 = ws.getRow(3)
  const row3Cells = []
  for (let c = 1; c <= 8; c++) {
    const cell = row3.getCell(c)
    row3Cells.push({
      col: c,
      val: cell.value ? cell.value.text || cell.value.result || cell.value : cell.value,
      style: cell.font ? { bold: cell.font.bold } : null,
    })
  }
  console.log('第3行(货架标签行)单元格:', JSON.stringify(row3Cells, null, 1))

  // 尝试修改一个单元格：把 成品一区 中 22.04.01.0053 的规格改一下
  let found = null
  ws.eachRow({ includeEmpty: true }, (row) => {
    if (found) return
    for (let c = 1; c <= 8; c++) {
      const v = row.getCell(c).value
      const txt = v ? (typeof v === 'object' ? v.text || v.result || '' : String(v)) : ''
      if (txt === '22.04.01.0053') {
        found = { row: row.number, col: c }
        return
      }
    }
  })
  console.log('找到 22.04.01.0053 位于:', found)
  if (found) {
    const cell = ws.getCell(found.row, found.col + 1) // 规格列
    cell.value = 'MT-H9200 V1.1 中文(验证写入)'
    console.log('已修改规格为: MT-H9200 V1.1 中文(验证写入)')
  }

  await wb.xlsx.writeFile(DST)
  console.log('已保存副本:', DST)

  // 重新读取副本验证
  const wb2 = new ExcelJS.Workbook()
  await wb2.xlsx.readFile(DST)
  let totalMerged2 = 0
  wb2.eachSheet((w) => {
    totalMerged2 += Object.keys(w._merges || {}).length
  })
  console.log('副本合并单元格总数:', totalMerged2)
  const ws2 = wb2.getWorksheet('成品一区')
  let found2 = null
  ws2.eachRow({ includeEmpty: true }, (row) => {
    if (found2) return
    for (let c = 1; c <= 8; c++) {
      const v = row.getCell(c).value
      const txt = v ? (typeof v === 'object' ? v.text || v.result || '' : String(v)) : ''
      if (txt === 'MT-H9200 V1.1 中文(验证写入)') found2 = { row: row.number, col: c }
    }
  })
  console.log('副本中验证写入位于:', found2)
  console.log('保真性验证完成：合并单元格', totalMerged, '->', totalMerged2)
}

main().catch((e) => {
  console.error('验证失败:', e)
  process.exit(1)
})
