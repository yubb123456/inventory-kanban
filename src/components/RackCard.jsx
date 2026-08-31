export default function RackCard({ zoneName, rack, query, editMode, onAdd, onEdit, onDelete }) {
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
      className={`panel overflow-hidden transition ${
        rackHit ? 'border-[#f59e0b]/70 shadow-glow' : ''
      }`}
    >
      <header className="flex items-center justify-between border-b border-[#eef1f6] bg-[#f8fafc] px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-[20px] font-extrabold text-black">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#d97706" strokeWidth="2">
            <path d="M4 4h16v16H4z" />
            <path d="M4 10h16M4 16h16M9 4v16M15 4v16" />
          </svg>
          {rack.name}
        </h3>
        <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[17px] font-bold text-[#334155]">
          {total} 项
        </span>
      </header>

      <div className="divide-y divide-[#f1f5f9]">
        {rack.slots.length === 0 && (
          <div className="flex items-center justify-between px-4 py-6">
            <span className="text-[20px] text-[#94a3b8]">空货架</span>
            {editMode && (
              <button
                onClick={() => onAdd(zoneName, rack.name, '')}
                className="rounded-md border border-[#d7dee9] px-2.5 py-1 text-[18px] text-[#64748b] transition hover:border-[#f59e0b] hover:text-[#d97706]"
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
          />
        ))}
      </div>
    </article>
  )
}

function SlotSection({ zoneName, rackName, slot, query, editMode, onAdd, onEdit, onDelete }) {
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
    <div className={`px-4 py-3 ${hit ? 'bg-[#fff7e6]' : ''}`}>
      <div className="mb-2 flex items-center gap-2">
        {hasSub ? (
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[17px] font-semibold ${
              hit ? 'bg-[#f59e0b] text-white' : 'bg-[#fff3d6] text-[#b45309]'
            }`}
          >
            {slot.sub}
          </span>
        ) : (
          <span className="text-[17px] font-bold text-[#475569]">默认储位</span>
        )}
        <span className="text-[17px] font-semibold text-[#64748b]">{slot.items.length} 项</span>
        {editMode && (
          <button
            onClick={() => onAdd(zoneName, rackName, slot.sub)}
            className="ml-auto rounded-md border border-[#d7dee9] px-2 py-0.5 text-[17px] text-[#64748b] transition hover:border-[#f59e0b] hover:text-[#d97706]"
          >
            + 添加
          </button>
        )}
      </div>

      {slot.items.length === 0 ? (
        <p className="text-[18px] text-[#b6c0d0]">—</p>
      ) : (
        <ul className="space-y-1">
          {slot.items.map((it, ii) => {
            const hitItem =
              query &&
              (it.code.toLowerCase().includes(query) ||
                (it.spec && it.spec.toLowerCase().includes(query)))
            return (
              <li
                key={`${it.code}-${ii}`}
                className={`group flex items-center gap-2 rounded px-1.5 py-0.5 leading-tight ${
                  hitItem ? 'bg-[#f59e0b]/15 ring-1 ring-[#f59e0b]/40' : ''
                }`}
              >
                <span className="code-text min-w-0 flex-1 truncate text-[19px] font-bold text-black">
                  {it.code}
                </span>
                <span className="min-w-0 flex-1 truncate text-[18px] font-semibold text-[#1f2937]">{it.spec}</span>
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
