// 测试 exceljs 对合并单元格从属值的处理
import ExcelJS from 'exceljs'
const SRC = 'C:/Users/Administrator/Desktop/成品定点定位看板.xlsx'
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(SRC)
const ws = wb.getWorksheet('成品一区')

// R3 是合并的"成品一区货架"，检查每个单元格
for (let c = 1; c <= 8; c++) {
  const cell = ws.getRow(3).getCell(c)
  console.log(
    `R3C${c}: isMerged=${cell.isMerged}, master=this=${cell.master === cell}, value=`,
    cell.value ? (cell.value.text || cell.value.result || cell.value) : null,
  )
}
console.log('---R5 数据行---')
for (let c = 1; c <= 8; c++) {
  const cell = ws.getRow(5).getCell(c)
  const v = cell.value
  console.log(`R5C${c}: isMerged=${cell.isMerged}, value=${v ? (v.text || v.result || v) : null}`)
}
// 获取合并范围
const merges = ws.model.merges || []
console.log('R3 相关合并:', merges.filter((m) => m.top === 3 || m.bottom === 3).slice(0, 5))
