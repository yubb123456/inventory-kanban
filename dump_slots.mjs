import { ExcelStore } from './server/store.js'
const store = new ExcelStore({ excelPath: process.argv[2] })
await store.load()
console.log('=== slotSegments keys ===')
for (const [key, segs] of store.slotSegments.entries()) {
  if (key.startsWith('成品一区::')) {
    console.log(key, '->', segs.map(s => `col${s.col} r${s.startRow}-${s.endRow} items${s.items.length}`).join(' | '))
  }
}
console.log('\n=== rackLabelCells ===')
for (const [key, v] of store.rackLabelCells.entries()) {
  if (key.startsWith('成品一区::')) console.log(key, '->', JSON.stringify(v))
}
