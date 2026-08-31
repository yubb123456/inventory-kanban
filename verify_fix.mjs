import { ExcelStore } from './server/store.js'
const store = new ExcelStore({ excelPath: process.argv[2] })
await store.load()
console.log('区域数:', store.data.zones.length)
console.log('区域列表:', store.data.zones.map(z => z.name).join(', '))
console.log('totalItems:', store.data.totalItems)
for (const z of store.data.zones) {
  if (z.name === '三栋五楼成品') {
    console.log('\n三栋五楼成品 racks:', z.racks.map(r => `${r.name}(${r.slots.reduce((s,sl)=>s+sl.items.length,0)})`).join(', '))
  }
  if (z.name === '成品一区') {
    const r = z.racks.find(x => x.name === '成品一区货架')
    console.log('\n成品一区货架 items:', r ? r.slots.reduce((s,sl)=>s+sl.items.length,0) : '未找到!')
  }
}
