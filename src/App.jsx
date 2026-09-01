import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api.js'
import staticSnapshot from './data/kanban-data.json'
import SearchBar from './components/SearchBar.jsx'
import ZoneTabs from './components/ZoneTabs.jsx'
import RackCard from './components/RackCard.jsx'
import ItemModal from './components/ItemModal.jsx'
import ZoneModal from './components/ZoneModal.jsx'
import RackModal from './components/RackModal.jsx'
import ManageCodeModal from './components/ManageCodeModal.jsx'

const ALL_ZONES = '__all__'
const MANAGE_CODE = '2580' // 管理模式访问码（查看开放，增删改需验证此码）

function buildIndex(data) {
  const items = []
  let uid = 0
  data.zones.forEach((zone) => {
    zone.racks.forEach((rack) => {
      rack.slots.forEach((slot) => {
        const sub = slot.sub
        slot.items.forEach((it) => {
          items.push({
            uid: uid++,
            code: it.code,
            spec: it.spec,
            pos: it.pos,
            zoneName: zone.name,
            zoneTitle: zone.title,
            rackName: rack.name,
            sub,
            slotKey: `${zone.name}::${rack.name}::${sub}`,
          })
        })
      })
    })
  })
  return items
}

export default function App() {
  const headerRef = useRef(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [zones, setZones] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeZone, setActiveZone] = useState(ALL_ZONES)
  const [query, setQuery] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [manageModalOpen, setManageModalOpen] = useState(false) // 管理模式访问码弹窗

  const [modal, setModal] = useState(null)
  const [zoneModal, setZoneModal] = useState(null)
  const [rackModal, setRackModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState(false) // 实时同步连接状态
  const [staticMode, setStaticMode] = useState(false) // 静态快照模式（无后端，如 GitHub Pages）
  const [zoneOpen, setZoneOpen] = useState(true) // 仓库区域面板：默认展开
  const [zoneHitCodes, setZoneHitCodes] = useState([]) // 跳转进入区域后要标红的型号集合
  const [autoScroll, setAutoScroll] = useState(true) // 进入该区域查看时自动滚动定位到命中型号（默认开启）

  // header 在数据加载完成后才渲染，因此测量依赖 zones.length（须在 zones 声明之后）
  useEffect(() => {
    if (!zones.length) return
    const measure = () => setHeaderHeight(headerRef.current?.offsetHeight || 0)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [zones.length])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getData()
      setZones(data.zones)
      setTotalItems(data.totalItems)
      setStaticMode(false)
    } catch (e) {
      // 无后端可用（如 GitHub Pages 静态托管）：回退到打包的静态快照，只读模式
      try {
        const snap = staticSnapshot && staticSnapshot.data ? staticSnapshot.data : staticSnapshot
        if (snap && snap.zones) {
          setZones(snap.zones)
          setTotalItems(snap.totalItems || 0)
          setStaticMode(true)
        } else {
          setError(e.message || '无法连接看板数据服务')
        }
      } catch (e2) {
        setError(e2.message || '无法连接看板数据服务')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // 首次加载
  useEffect(() => {
    loadData()
  }, [loadData])

  // SSE 实时同步：任一端增删改后，所有在线端自动收到最新数据（静态快照模式不建立连接）
  useEffect(() => {
    if (staticMode) {
      setLive(false)
      return undefined
    }
    let es
    try {
      es = new EventSource('/api/events')
      es.onopen = () => setLive(true)
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'data' && msg.data && msg.data.zones) {
            setZones(msg.data.zones)
            setTotalItems(msg.data.totalItems)
            setLoading(false)
            setError('')
          }
        } catch (e) {
          /* 忽略解析失败 */
        }
      }
      es.onerror = () => setLive(false) // 断开时提示，EventSource 会自动重连
    } catch (e) {
      setLive(false)
    }
    return () => {
      if (es) es.close()
    }
  }, [staticMode])

  const items = useMemo(() => buildIndex({ zones, totalItems }), [zones, totalItems])
  const normalizedQuery = query.trim().toLowerCase()

  const matchedItems = useMemo(() => {
    if (!normalizedQuery) return []
    return items.filter((it) => {
      return (
        it.code.toLowerCase().includes(normalizedQuery) ||
        (it.spec && it.spec.toLowerCase().includes(normalizedQuery))
      )
    })
  }, [items, normalizedQuery])

  const searching = normalizedQuery.length > 0
  const matchedCount = matchedItems.length
  const matchedSlotsCount = useMemo(() => {
    const seen = new Set()
    matchedItems.forEach((it) => seen.add(it.slotKey))
    return seen.size
  }, [matchedItems])

  const zoneStats = useMemo(() => {
    const map = {}
    items.forEach((it) => {
      map[it.zoneName] = (map[it.zoneName] || 0) + 1
    })
    return map
  }, [items])

  function gotoZone(zoneName, hitItems) {
    // 记录该区域内搜索命中的型号，跳转后标红
    const codes = (hitItems || []).map((it) => it.code)
    setZoneHitCodes(codes)
    setQuery('') // 退出搜索，进入完整区域视图
    setActiveZone(zoneName)
    setZoneOpen(true) // 展开区域面板
    // 自动定位开关开启时：等待视图切换渲染完成后平滑滚动定位（有命中项→居中定位到首个命中储位行；否则→区域标题）；关闭时不做任何自动滚动，仅切换视图
    if (!autoScroll) return
    setTimeout(() => {
      const firstCode = codes[0]
      const el = firstCode
        ? document.querySelector(`[data-zone="${zoneName}"] [data-code="${firstCode}"]`)
        : document.querySelector(`[data-zone="${zoneName}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: firstCode ? 'center' : 'start' })
    }, 160)
  }

  async function handleSubmit(payload) {
    setBusy(true)
    setError('')
    try {
      if (payload.type === 'add') {
        await api.addItem({
          zoneName: payload.zoneName,
          rackName: payload.rackName,
          sub: payload.sub,
          code: payload.code,
          spec: payload.spec,
        })
      } else if (payload.type === 'update') {
        await api.updateItem({
          sheet: payload.sheet,
          row: payload.row,
          col: payload.col,
          code: payload.code,
          spec: payload.spec,
        })
      } else if (payload.type === 'move') {
        await api.moveItem({
          sheet: payload.sheet,
          row: payload.row,
          col: payload.col,
          targetZone: payload.targetZone,
          targetRack: payload.targetRack,
          targetSub: payload.targetSub,
        })
      }
      await loadData()
      setModal(null)
    } catch (e) {
      setError(e.message || '操作失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(zoneName, rackName, sub, item) {
    const ok = window.confirm(
      `确定删除以下商品？\n\n编码：${item.code}\n型号：${item.spec || '-'}\n储位：${zoneName} / ${rackName}${sub ? ' / ' + sub : ''}`,
    )
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await api.deleteItem({ sheet: item.pos.sheet, row: item.pos.row, col: item.pos.col })
      await loadData()
    } catch (e) {
      setError(e.message || '删除失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleZoneSubmit(payload) {
    setBusy(true)
    setError('')
    try {
      if (payload.mode === 'add') {
        await api.addZone(payload.title)
      } else if (payload.mode === 'rename') {
        await api.renameZone(payload.name, payload.title)
      }
      setZoneModal(null)
    } catch (e) {
      setError(e.message || '区域操作失败')
    } finally {
      setBusy(false)
    }
  }

  async function handleZoneDelete(name, title) {
    const count = zoneStats[name] || 0
    const ok = window.confirm(
      `确定删除区域「${title}」吗？\n\n该区域当前有 ${count} 个商品。\n非空区域无法删除（需先清空商品）；空区域删除后不可恢复。`,
    )
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await api.deleteZone(name)
    } catch (e) {
      setError(e.message || '删除区域失败')
    } finally {
      setBusy(false)
    }
  }

  /** 货架改名提交 */
  async function handleRackSubmit(payload) {
    setBusy(true)
    setError('')
    try {
      await api.renameRack(payload.sheetName, payload.rackName, payload.newRackName)
      setRackModal(null)
    } catch (e) {
      setError(e.message || '货架改名失败')
    } finally {
      setBusy(false)
    }
  }

  /** 货架删除：非空货架需二次确认（连同商品删除） */
  async function handleRackDelete(sheetName, rackName, count) {
    const ok = window.confirm(
      count > 0
        ? `确定删除货架「${rackName}」吗？\n\n该货架当前有 ${count} 个商品，将连同商品一起删除，不可恢复。`
        : `确定删除空货架「${rackName}」吗？删除后不可恢复。`,
    )
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await api.deleteRack(sheetName, rackName, count > 0)
    } catch (e) {
      setError(e.message || '删除货架失败')
    } finally {
      setBusy(false)
    }
  }

  function openAdd(zoneName, rackName, sub) {
    setModal({ mode: 'add', preset: { zoneName, rackName, sub } })
  }

  function openEdit(zoneName, rackName, sub, item) {
    setModal({
      mode: 'edit',
      initial: {
        zoneName,
        rackName,
        sub,
        zoneTitle: zones.find((z) => z.name === zoneName)?.title || zoneName,
        code: item.code,
        spec: item.spec,
        pos: item.pos,
      },
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e5e9f2] border-t-[#f59e0b]" />
        <p className="text-[18px] text-[#64748b]">正在加载库存数据（首次约 20 秒）…</p>
      </div>
    )
  }

  if (error && !zones.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <p className="text-[20px] text-red-500">{error}</p>
        <p className="text-[18px] text-[#64748b]">请先启动后端服务：npm run server</p>
        <button
          onClick={loadData}
          className="rounded-lg border border-[#d7dee9] px-4 py-2 text-[18px] text-[#334155] transition hover:border-[#f59e0b] hover:text-[#d97706]"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header ref={headerRef} className="glass-strong sticky top-0 z-30 border-b border-white/70 shadow-[0_1px_0_rgba(255,255,255,0.8),0_2px_16px_rgba(15,23,42,0.08)]">
        <div className="relative px-4 py-2 sm:px-6">
          <div className="flex flex-col items-center gap-1.5">
            {/* 标题行：居中（图标绝对定位，不挤占文字） */}
            <div className="relative flex w-full items-center justify-center">
              <div className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-lg border border-[#f3d08a] bg-gradient-to-br from-[#fff7e6] to-[#ffe9bf] shadow-sm">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M3 21V9l9-6 9 6v12" />
                  <path d="M3 21h18M9 21v-6h6v6" />
                </svg>
              </div>
              <div className="text-center">
                <h1 className="text-[25px] font-extrabold leading-tight tracking-wide text-black">
                  成品仓定点定位看板
                </h1>
                <p className="mt-0 flex flex-wrap items-center justify-center gap-1.5 text-[15px] font-semibold text-[#4b5563]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#fff7e6] px-1.5 py-0.5 text-[14px] font-bold text-[#b45309]">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21V9l9-6 9 6v12" /><path d="M3 21h18M9 21v-6h6v6" /></svg>
                      {zones.length} 个区域
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#eef4ff] px-1.5 py-0.5 text-[14px] font-bold text-[#1d4ed8]">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 4 5v6c0 5 3.4 8.6 8 11 4.6-2.4 8-6 8-11V5z" /></svg>
                      {totalItems} 个在库 SKU
                    </span>
                  </span>
                  <span
                    className={`badge ${
                      staticMode
                        ? 'bg-sky-50 text-sky-600'
                        : live
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                    }`}
                    title={
                      staticMode
                        ? '静态快照：网页部署在 GitHub Pages，展示打包时的数据快照，仅供查看'
                        : live
                          ? '已连接实时同步，任一设备改动会实时推送'
                          : '实时同步连接中断，正在自动重连…'
                    }
                  >
                    <span className={`h-1.5 w-1.5 rounded-full pulse-dot ${staticMode ? 'bg-sky-500' : live ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {staticMode ? '静态快照' : live ? '实时同步' : '重连中'}
                  </span>
                </p>
              </div>
            </div>
            {/* 搜索栏：标题下方一行，居中 */}
            <div className="flex w-full max-w-2xl items-center justify-center">
              <SearchBar
                query={query}
                onChange={(q) => {
                  setZoneHitCodes([]) // 修改搜索时清除跳转标红
                  setQuery(q)
                }}
                matchCount={searching ? matchedCount : null}
                slotCount={searching ? matchedSlotsCount : null}
              />
            </div>
            {/* 按钮行：仓库区域 + 管理模式，并排居中 */}
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setZoneOpen((v) => !v)}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[17px] font-semibold transition ${
                  zoneOpen
                    ? 'border-[#f59e0b] bg-[#fff7e6] text-[#d97706] shadow-[0_1px_4px_rgba(217,119,6,0.18)]'
                    : 'border-white/80 bg-white/50 text-[#4b5563] shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur hover:border-[#b6c0d0] hover:text-[#111827]'
                }`}
                title="展开 / 收起仓库区域（区域标签与货架储位）"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
                </svg>
                仓库区域
                <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${zoneOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {!staticMode && (
                <button
                  onClick={() => {
                    if (editMode) {
                      setEditMode(false) // 退出管理模式无需验证
                    } else {
                      setManageModalOpen(true) // 进入管理模式需验证访问码
                    }
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[17px] font-semibold transition ${
                    editMode
                      ? 'btn-primary'
                      : 'border-white/80 bg-white/50 text-[#4b5563] shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur hover:border-[#b6c0d0] hover:text-[#111827]'
                  }`}
                  title="开启后可添加/编辑/删除商品，改动实时写回 Excel（需访问码）"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  管理模式
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="px-4 pt-3 sm:px-6">
          <div className="rounded-lg border border-red-200/80 bg-red-50/70 px-4 py-2.5 text-[18px] text-red-600 backdrop-blur">
            {error}
          </div>
        </div>
      )}

      {searching && (
        <div className="px-4 pt-4 sm:px-6">
          <div className="fade-up flex flex-wrap items-center gap-2 rounded-lg border border-red-200/80 bg-red-50/70 px-4 py-2.5 text-[18px] font-semibold text-red-400 shadow-[0_1px_3px_rgba(239,68,68,0.06)] backdrop-blur">
            <span>
              命中 {matchedCount} 个 SKU，分布在 {matchedSlotsCount} 个储位
            </span>
            {matchedCount === 0 && <span>未找到匹配项，试试编码或型号关键词</span>}
            <button
              onClick={() => setAutoScroll((v) => !v)}
              className={`ml-auto inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[15px] font-semibold transition ${
                autoScroll
                  ? 'border-[#f59e0b] bg-[#fff7e6] text-[#d97706]'
                  : 'border-[#d7dee9] bg-white/50 text-[#64748b]'
              }`}
              title="进入该区域查看时，是否自动滚动定位到命中型号位置"
            >
              <span
                className={`inline-block h-3 w-3 rounded-full transition ${
                  autoScroll ? 'bg-[#f59e0b]' : 'bg-[#cbd5e1]'
                }`}
              />
              自动定位
            </button>
          </div>
        </div>
      )}

      {!searching && zoneOpen && (
        <div
          className="glass-strong sticky z-20 flex flex-wrap items-center justify-between gap-2 border-b border-white/70 px-4 pb-2 pt-2 transition-shadow sm:px-6"
          style={{ top: headerHeight, boxShadow: '0 6px 16px rgba(15,23,42,0.08)' }}
        >
          <ZoneTabs
            zones={zones}
            activeZone={activeZone}
            onChange={(zn) => {
              setZoneHitCodes([]) // 手动切换区域标签时清除跳转标红
              setActiveZone(zn)
            }}
            zoneStats={zoneStats}
            allLabel="全部区域"
          />
          {!staticMode && (
            <button
              onClick={() => setZoneModal({ mode: 'add' })}
              className="btn-primary px-2.5 py-1.5 text-[15px]"
              title="新增一个仓库区域（写入 Excel 新工作表）"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              新增区域
            </button>
          )}
        </div>
      )}

      <main className="px-4 py-4 sm:px-6">
        {searching ? (
          <div className="fade-up">
            {matchedItems.length === 0 ? (
              <div className="panel flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f8fafc] to-[#eef1f6] ring-1 ring-[#e3e8f0]">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#8a94a6" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <div>
                  <p className="text-[20px] font-bold text-[#1f2937]">未找到匹配的储位</p>
                  <p className="mt-1 text-[18px] text-[#8a94a6]">请尝试输入商品编码或型号关键词</p>
                </div>
              </div>
            ) : (
              <SearchResults
                items={matchedItems}
                onGotoZone={gotoZone}
                editMode={staticMode ? false : editMode}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        ) : zoneOpen ? (
          <div className="fade-up">
            {zones
              .filter((z) => activeZone === ALL_ZONES || z.name === activeZone)
              .map((zone) => (
                <section key={zone.name} data-zone={zone.name} className="mb-4 scroll-mt-[310px]">
                  <div className="mb-1.5 flex items-center gap-2">
                    <h2 className="flex items-center gap-2 text-[24px] font-extrabold leading-none text-black">
                      <span className="inline-block h-5 w-1.5 rounded-full bg-gradient-to-b from-[#fbbf24] to-[#d97706] shadow-[0_1px_3px_rgba(217,119,6,0.4)]" />
                      {zone.title}
                    </h2>
                    <span className="badge bg-[#eef4ff] text-[#1d4ed8] text-[12px]">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 4 5v6c0 5 3.4 8.6 8 11 4.6-2.4 8-6 8-11V5z" /></svg>
                      {zoneStats[zone.name] || 0} 个在库 SKU
                    </span>
                    {!staticMode && (
                      <>
                        <button
                          onClick={() => setZoneModal({ mode: 'rename', initial: { name: zone.name, title: zone.title } })}
                          className="ml-1 flex shrink-0 items-center gap-1 rounded-md border border-[#d7dee9] px-2 py-0.5 text-[12px] font-semibold text-[#64748b] transition hover:border-[#f59e0b] hover:text-[#d97706]"
                          title="重命名该区域（写入 Excel）"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                          重命名
                        </button>
                        <button
                          onClick={() => handleZoneDelete(zone.name, zone.title)}
                          className="ml-1 flex shrink-0 items-center gap-1 rounded-md border border-red-200 px-2 py-0.5 text-[12px] font-semibold text-red-500 transition hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                          title="删除该区域（仅空区域可删，防止误删有商品的区域）"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                          </svg>
                          删除
                        </button>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5">
                    {zone.racks.map((rack, idx) => (
                      <RackCard
                        key={`${zone.name}-${rack.name}-${idx}`}
                        zoneName={zone.name}
                        rack={rack}
                        query={normalizedQuery}
                        editMode={staticMode ? false : editMode}
                        onAdd={openAdd}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onRenameRack={(zn, rn) => setRackModal({ mode: 'rename', initial: { zoneName: zn, rackName: rn } })}
                        onDeleteRack={handleRackDelete}
                        hitCodes={zoneHitCodes}
                      />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        ) : (
          <div className="fade-up panel flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff7e6] to-[#ffe9bf] ring-1 ring-[#f3d08a]">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#d97706" strokeWidth="1.5">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-[20px] font-bold text-[#1f2937]">仓库区域已收起</p>
              <p className="mt-1 text-[18px] text-[#8a94a6]">点击上方「仓库区域」按钮，展开区域标签与货架储位分布</p>
            </div>
          </div>
        )}
      </main>

      <footer className="glass border-t border-white/70 py-5 text-center text-[16px] font-semibold text-[#8a94a6]">
        <span className="inline-flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21V9l9-6 9 6v12" /><path d="M3 21h18M9 21v-6h6v6" /></svg>
          成品仓定点定位看板
        </span>
        <span className="mx-2 text-[#c3cad8]">·</span>
        {staticMode ? '静态快照 · 仅供查看（GitHub Pages）' : '数据实时写回《成品定点定位看板.xlsx》'}
      </footer>

      {modal && (
        <ItemModal
          mode={modal.mode}
          zones={zones}
          initial={modal.initial}
          preset={modal.preset}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          busy={busy}
        />
      )}

      {zoneModal && (
        <ZoneModal
          mode={zoneModal.mode}
          zones={zones}
          initial={zoneModal.initial}
          onClose={() => setZoneModal(null)}
          onSubmit={handleZoneSubmit}
          busy={busy}
        />
      )}

      {rackModal && (
        <RackModal
          mode={rackModal.mode}
          initial={rackModal.initial}
          onClose={() => setRackModal(null)}
          onSubmit={handleRackSubmit}
          busy={busy}
        />
      )}

      {manageModalOpen && (
        <ManageCodeModal
          onClose={() => setManageModalOpen(false)}
          onSubmit={(code, fail) => {
            if (code === MANAGE_CODE) {
              setEditMode(true)
              setManageModalOpen(false)
            } else {
              fail()
            }
          }}
        />
      )}
    </div>
  )
}

function SearchResults({ items, onGotoZone, editMode, onEdit, onDelete }) {
  const groups = {}
  items.forEach((it) => {
    if (!groups[it.zoneName]) groups[it.zoneName] = []
    groups[it.zoneName].push(it)
  })

  return (
    <div>
      {Object.entries(groups).map(([zoneName, list]) => (
        <section key={zoneName} className="mb-2">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold text-black">{zoneName}</h2>
            <button
              onClick={() => onGotoZone(zoneName, list)}
              className="group inline-flex items-center gap-0.5 rounded-md border border-[#d7dee9] px-2 py-0.5 text-[10px] font-semibold text-[#64748b] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#f59e0b] hover:bg-[#fff7e6] hover:text-[#d97706] hover:shadow-[0_3px_8px_rgba(217,119,6,0.22)] active:translate-y-0 active:shadow-none"
            >
              进入该区域查看
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <div className="space-y-0.5">
            {list.map((it) => (
              <div key={it.uid} className="panel flex flex-wrap items-center gap-y-0 px-2 py-0.5">
                <span className="code-text mr-[2ch] text-[12px] font-bold text-black">{it.code}</span>
                <span className="mr-2 text-[12px] font-semibold text-[#111827]">{it.spec}</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#475569]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  {it.rackName}
                  {it.sub ? ` · ${it.sub}` : ''}
                </span>
                {editMode && (
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(it.zoneName, it.rackName, it.sub, it)}
                      className="rounded p-1 text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#d97706]"
                      title="编辑/移动"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(it.zoneName, it.rackName, it.sub, it)}
                      className="rounded p-1 text-[#94a3b8] transition hover:bg-red-50 hover:text-red-500"
                      title="删除"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
