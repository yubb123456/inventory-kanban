// 对比权威备份(1508) 与 删除前备份(1507)，定位历史丢失的 SKU
import { ExcelStore } from '../server/store.js'

async function load(path) {
  const s = new ExcelStore({ excelPath: path })
  await s.load()
  return s
}

const auth = 'C:\\Users\\Administrator\\Documents\\lingxi-claw\\20260831-09-40-13-249\\backup-成品定点定位看板-删除区域验证前.xlsx'
const pre = 'C:\\Users\\Administrator\\Documents\\lingxi-claw\\20260831-09-40-13-249\\backup-成品定点定位看板-删除氤氪六楼前.xlsx'

try {
  const s1 = await load(auth) // 权威
  const s2 = await load(pre)  // 本次删除前
  console.log('权威备份 totalItems=', s1.data.totalItems)
  console.log('删除前备份 totalItems=', s2.data.totalItems)

  const mk = (s) => {
    const m = {}
    s.data.zones.forEach((z) => z.racks.forEach((r) => r.slots.forEach((sl) => sl.items.forEach((it) => {
      const k = `${z.name}|${it.code}|${it.spec}`
      m[k] = (m[k] || 0) + 1
    }))))
    return m
  }
  const m1 = mk(s1), m2 = mk(s2)
  console.log('\n=== 权威有、删除前没有 ===')
  for (const k in m1) if (!m2[k]) console.log('  -', k)
  console.log('=== 删除前有、权威没有 ===')
  for (const k in m2) if (!m1[k]) console.log('  +', k)
  process.exit(0)
} catch (e) { console.error(e); process.exit(1) }
