import { useEffect, useMemo, useState } from 'react'

export default function ItemModal({ mode, zones, initial, preset, onClose, onSubmit, busy }) {
  const isEdit = mode === 'edit'

  const [zoneName, setZoneName] = useState(initial?.zoneName || preset?.zoneName || zones[0]?.name || '')
  const [rackName, setRackName] = useState(initial?.rackName || preset?.rackName || '')
  const [sub, setSub] = useState(initial?.sub || preset?.sub || '')
  const [code, setCode] = useState(initial?.code || '')
  const [spec, setSpec] = useState(initial?.spec || '')
  const [error, setError] = useState('')

  const zone = zones.find((z) => z.name === zoneName)
  const racks = zone?.racks || []
  const rack = racks.find((r) => r.name === rackName)
  const subs = useMemo(() => (rack ? rack.slots.map((s) => s.sub) : []), [rack])
  const subOptions = subs.length ? subs : ['']

  useEffect(() => {
    const z = zones.find((x) => x.name === zoneName)
    if (z && z.racks.length && !z.racks.some((r) => r.name === rackName)) {
      setRackName(z.racks[0].name)
    }
  }, [zoneName, zones, rackName])

  useEffect(() => {
    const r = racks.find((x) => x.name === rackName)
    if (r && r.slots.length && !r.slots.some((s) => s.sub === sub)) {
      setSub(r.slots[0].sub)
    }
  }, [rackName, racks, sub])

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!zoneName || !rackName) return setError('请选择区域与货架')
    if (!code.trim()) return setError('请输入商品编码')

    if (isEdit) {
      const moved = zoneName !== initial.zoneName || rackName !== initial.rackName || sub !== initial.sub
      onSubmit({
        type: moved ? 'move' : 'update',
        sheet: initial.pos.sheet,
        row: initial.pos.row,
        col: initial.pos.col,
        code: code.trim(),
        spec: spec.trim(),
        targetZone: zoneName,
        targetRack: rackName,
        targetSub: sub,
      })
    } else {
      onSubmit({
        type: 'add',
        zoneName,
        rackName,
        sub,
        code: code.trim(),
        spec: spec.trim(),
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/40 p-4" onClick={onClose}>
      <div
        className="panel w-full max-w-md fade-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-[#eef1f6] px-5 py-3.5">
          <h2 className="text-[20px] font-extrabold text-black">
            {isEdit ? '编辑 / 移动商品' : '添加商品'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#334155]"
            aria-label="关闭"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {isEdit && initial && (
            <div className="rounded-lg border border-[#eef1f6] bg-[#f8fafc] px-3 py-2 text-[16px] font-semibold text-[#1f2937]">
              当前储位：{initial.zoneTitle} / {initial.rackName}
              {initial.sub ? ` / ${initial.sub}` : ''}
            </div>
          )}

          <Field label="仓库区域">
            <select value={zoneName} onChange={(e) => setZoneName(e.target.value)} className="select">
              {zones.map((z) => (
                <option key={z.name} value={z.name}>
                  {z.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="货架">
            <select
              value={rackName}
              onChange={(e) => setRackName(e.target.value)}
              className="select"
              disabled={!racks.length}
            >
              {!racks.length && <option value="">该区域暂无货架</option>}
              {racks.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={subOptions.length > 1 || subOptions[0] !== '' ? '储位细分' : '储位'}>
            <select
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              className="select"
              disabled={!subOptions.length}
            >
              {subOptions.map((s) => (
                <option key={s || '(默认)'} value={s}>
                  {s === '' ? '(默认储位)' : s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="商品编码（必填）">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="如 19.01.13.0018"
              className="input mono"
              autoFocus
            />
          </Field>

          <Field label="规格型号">
            <input
              type="text"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="如 MT-HD121 V1.5 中文"
              className="input"
            />
          </Field>

          {error && <p className="text-[18px] text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost px-4 py-2">
              取消
            </button>
            <button type="submit" disabled={busy} className="btn-primary px-4 py-2">
              {busy ? '保存中…' : isEdit ? '保存修改' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[16px] font-bold text-[#475569]">{label}</span>
      {children}
    </label>
  )
}
