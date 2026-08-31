import { ExcelStore } from './server/store.js'
const store = new ExcelStore({ excelPath: process.argv[2] })
await store.load()
for (const z of store.data.zones) {
  if (z.name === '成品一区') {
    console.log('成品一区 racks:', z.racks.map(r => `${r.name}(${r.slots.reduce((s,sl)=>s+sl.items.length,0)})`).join(', '))
  }
}
const d = store.data.zones.find(z=>z.name==='成品一区')
if (d) for (const r of d.racks) console.log('  -', r.name, 'slots:', r.slots.length, 'items:', r.slots.reduce((s,sl)=>s+sl.items.length,0))
