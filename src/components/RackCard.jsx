export default function RackCard({ zoneName, rack, query, editMode, onAdd, onEdit, onDelete, onRenameRack, onDeleteRack, hitCodes }) {
  const total = rack.slots.reduce((n, s) => n + s.items.length, 0)

  let rackHit = false
  if (query) {
    rackHit = rack.slots.some((s) =>
      s.items.some(
        (it) =>
          it.code.toLowerCase().includes(query) ||
          (it.spec && it.spec.toLowerCase().includes(query)),
      ),
    )
  }

  return (
    <article
      className={`panel panel-hover overflow-hidden ${
        rackHit ? 'border-[#f59e0b]/70 shadow-glow' : ''
      }`}
    >
      <header className="flex items-center justify-between border-b border-white/70 bg-white/35 px-3.5 py-2 backdrop-blur-sm">
        <h3 className="flex items-center gap-2 text-[18px] font-extrabold text-black">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#fff7e6] to-[#ffe9bf] ring-1 ring-[#f3d08a]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="#d97706" strokeWidth="2">
              <path d="M4 4h16v16H4z" />
              <path d="M4 10h16M4 16h16M9 4v16M15 4v16" />
            </svg>
          </span>
          {rack.name}
        </h3>
        <span className="flex shrink-0 items-center gap-2">
          {editMode && (
            <>
              <button
                onClick={() => onRenameRack(zoneName, rack.name)}
                className="btn-ghost px-2 py-0.5 text-[15px]"
                title="重命名货架"
              >
                改名
              </button>
              <button
                onClick={() => onDeleteRack(zoneName, rack.name, total)}
                className="btn-danger px-2 py-0.5 text-[15px]"
                title="删除货架（非空货架需确认）"
              >
                删除
              </button>
            </>
          )}
          <span className="badge bg-[#eef4ff] text-[#1d4ed8]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
            {total} 项
          </span>
        </span>
      </header>

      <div className="divide-y divide-[#eef1f6]">
        {rack.slots.length === 0 && (
          <div className="flex items-center justify-between px-3.5 py-5">
            <span className="inline-flex items-center gap-1.5 text-[18px] text-[#8a94a6]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" /></svg>
              空货架
            </span>
            {editMode && (
              <button
                onClick={() => onAdd(zoneName, rack.name, '')}
                className="btn-ghost px-2.5 py-1 text-[16px]"
              >
                + 添加商品
              </button>
            )}
          </div>
        )}
        {rack.slots.map((slot, si) => (
          <SlotSection
            key={`${zoneName}-${rack.name}-${si}`}
            zoneName={zoneName}
            rackName={rack.name}
            slot={slot}
            query={query}
            editMode={editMode}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            hitCodes={hitCodes}
          />
        ))}
      </div>
    </article>
  )
}

function SlotSection({ zoneName, rackName, slot, query, editMode, onAdd, onEdit, onDelete, hitCodes }) {
  const hasSub = slot.sub && slot.sub.length > 0
  let hit = false
  if (query) {
    hit = slot.items.some(
      (it) =>
        it.code.toLowerCase().includes(query) ||
        (it.spec && it.spec.toLowerCase().includes(query)),
    )
  }

  return (
    <div className={`px-3 py-2 transition ${hit ? 'bg-[#fff7e6]' : ''}`}>
      <div className="mb-1 flex items-center gap-2">
        {hasSub ? (
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[15px] font-semibold ${
              hit ? 'bg-[#f59e0b] text-white shadow-[0_1px_3px_rgba(217,119,6,0.3)]' : 'bg-[#fff3d6] text-[#b45309]'
            }`}
          >
            {slot.sub}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[15px] font-bold text-[#475569]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5v14" /></svg>
            默认储位
          </span>
        )}
        <span className="text-[15px] font-semibold text-[#64748b]">{slot.items.length} 项</span>
        {editMode && (
          <button
            onClick={() => onAdd(zoneName, rackName, slot.sub)}
            className="btn-ghost ml-auto px-2 py-0.5 text-[15px]"
          >
            + 添加
          </button>
        )}
      </div>

      {slot.items.length === 0 ? (
        <p className="px-1 py-1 text-[16px] text-[#b6c0d0]">—</p>
      ) : (
        <ul className="space-y-0.5">
          {slot.items.map((it, ii) => {
            const hitItem =
              query &&
              (it.code.toLowerCase().includes(query) ||
                (it.spec && it.spec.toLowerCase().includes(query)))
            const zoneHit = hitCodes && hitCodes.includes(it.code) // 跳转进入区域后要标红的命中型号
            return (
              <li
                key={`${it.code}-${ii}`}
                data-code={it.code}
                className={`group flex items-center rounded-md border border-[#eceff3]/80 bg-[#f5f7fa]/80 px-2 py-0.5 leading-tight transition ${
                  zoneHit
                    ? 'border-red-300 bg-red-100/90 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]'
                    : hitItem
                      ? 'hit'
                      : 'hover:border-[#bfdbfe] hover:bg-[#eff6ff]'
                }`}
              >
                <span className="code-text mr-[1ch] min-w-0 flex-1 truncate text-[17px] font-bold text-black">
                  {it.code}
                </span>
                <span className="mr-2 min-w-0 flex-1 truncate text-[16px] font-semibold text-[#1f2937]">{it.spec}</span>
                <span className="mr-1 w-20 shrink-0 truncate text-right text-[14px] font-semibold text-[#64748b]">{zoneName}</span>
                {editMode && (
                  <span className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => onEdit(zoneName, rackName, slot.sub, it)}
                      className="rounded p-0.5 text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#d97706]"
                      title="编辑/移动"
                      aria-label="编辑"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(zoneName, rackName, slot.sub, it)}
                      className="rounded p-0.5 text-[#94a3b8] transition hover:bg-red-50 hover:text-red-500"
                      title="删除"
                      aria-label="删除"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
