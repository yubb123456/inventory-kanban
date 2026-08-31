import ExcelJS from 'exceljs'

const CODE_RE = /^\d{2}\.\d{2}\.\d{2}\.\d{4}/
const COL_STARTS = [1, 3, 5, 7]

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

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(process.argv[2])
const ws = wb.getWorksheet('成品一区')
const sheetName = ws.name
console.log('sheetName =', JSON.stringify(sheetName))
for (let r = 1; r <= 8; r++) {
  const rowVals = []
  for (let c = 1; c <= 8; c++) {
    const v = cellText(ws.getCell(r, c).value)
    rowVals.push(v)
  }
  const nonempty = rowVals.map((t, i) => (t ? [i, t] : null)).filter(Boolean)
  const texts = nonempty.map(([, t]) => t)
  let verdict = 'data/其他'
  if (texts.some((t) => t.includes('定点定位看板'))) verdict = '看板标题(跳过)'
  else if (texts.some((t) => t.includes('编码'))) verdict = '表头(跳过)'
  else if (nonempty.length === 1 && (texts[0] === sheetName || (r <= 2 && ((texts[0].endsWith('区') || texts[0].endsWith('楼') || texts[0].endsWith('仓')) && !['货架', '矩阵', '编号'].some((k) => texts[0].includes(k)))))) verdict = '区域标题行'
  console.log(`row${r}: nonempty=${nonempty.length} texts=${JSON.stringify(texts)} -> ${verdict}`)
}
