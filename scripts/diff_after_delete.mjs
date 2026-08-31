// 对比两个 Excel 文件的区域商品数（复用 store 解析逻辑）
import { ExcelStore } from '../server/store.js'

async function summary(label, path) {
  const s = new ExcelStore({ excelPath: path })
  await s.load()
  const lines = [`=== ${label} ===  totalItems=${s.data.totalItems}`]
  for (const z of s.data.zones) {
    let n = 0
    for (const r of z.racks) for (const sl of r.slots) n += sl.items.length
    lines.push(`  ${z.name}: ${n}`)
  }
  console.log(lines.join('\n'))
  return s
}

const bak = 'C:\\Users\\Administrator\\Documents\\lingxi-claw\\20260831-09-40-13-249\\backup-成品定点定位看板-删除氤氪六楼前.xlsx'
const cur = 'C:\\Users\\Administrator\\Desktop\\成品定点定位看板.xlsx'

try {
  const s1 = await summary('备份(删除前)', bak)
  const s2 = await summary('当前桌面Excel', cur)

  const map1 = {}
  s1.data.zones.forEach((z) => z.racks.forEach((r) => r.slots.forEach((sl) => sl.items.forEach((it) => {
    map1[`${z.name}|${it.code}|${it.spec}`] = (map1[`${z.name}|${it.code}|${it.spec}`] || 0) + 1
  }))))
  const map2 = {}
  s2.data.zones.forEach((z) => z.racks.forEach((r) => r.slots.forEach((sl) => sl.items.forEach((it) => {
    map2[`${z.name}|${it.code}|${it.spec}`] = (map2[`${z.name}|${it.code}|${it.spec}`] || 0) + 1
  }))))

  console.log('\n=== 备份有、当前没有（排除氤氪六楼）===')
  for (const k in map1) {
    if (!map2[k] && !k.startsWith('氤氪六楼|')) console.log('  -', k)
  }
  console.log('=== 当前有、备份没有 ===')
  for (const k in map2) if (!map1[k]) console.log('  +', k)
  console.log('\n备份总条数:', Object.values(map1).reduce((a, b) => a + b, 0),
    '| 当前总条数:', Object.values(map2).reduce((a, b) => a + b, 0))
  process.exit(0)
} catch (e) { console.error(e); process.exit(1) }
