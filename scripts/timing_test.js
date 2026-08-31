// 计时：exceljs 读 + 写一个商品单元格 的耗时
import ExcelJS from 'exceljs'

const SRC = 'C:/Users/Administrator/Desktop/成品定点定位看板.xlsx'
const DST = 'C:/Users/Administrator/Documents/lingxi-claw/20260831-09-40-13-249/timing-out.xlsx'

const t0 = Date.now()
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(SRC)
const t1 = Date.now()
console.log(`读取耗时: ${t1 - t0} ms`)

const ws = wb.getWorksheet('成品一区')
// 修改一个单元格
ws.getCell(5, 6).value = 'MT-H9200 V1.1 中文(计时)'
const t2 = Date.now()
console.log(`修改耗时: ${t2 - t1} ms`)

await wb.xlsx.writeFile(DST)
const t3 = Date.now()
console.log(`写盘耗时: ${t3 - t2} ms`)
console.log(`总耗时: ${t3 - t0} ms`)
