const ZONE_COLORS = [
  '#f59e0b', // 琥珀
  '#3b82f6', // 蓝
  '#10b981', // 绿
  '#8b5cf6', // 紫
  '#ec4899', // 粉
  '#14b8a6', // 青
  '#f97316', // 橙
  '#6366f1', // 靛
  '#84cc16', // 黄绿
  '#06b6d4', // 天蓝
  '#a855f7', // 紫罗兰
  '#ef4444', // 红
]

export default function ZoneTabs({ zones, activeZone, onChange, zoneStats, allLabel }) {
  const allCount = Object.values(zoneStats).reduce((a, b) => a + b, 0)
  const zonesSorted = [...zones].sort((a, b) => {
    const num = (s) => {
      const m = s.match(/(\d+)/)
      return m ? parseInt(m[1], 10) : 999
    }
    return num(a.name) - num(b.name) || a.name.localeCompare(b.name, 'zh-CN')
  })

  return (
    <div className="flex flex-wrap gap-1.5">
      <ZoneTab label={allLabel} count={allCount} active={activeZone === '__all__'} onClick={() => onChange('__all__')} color="#f59e0b" />
      {zonesSorted.map((z, i) => (
        <ZoneTab
          key={z.name}
          label={z.title}
          count={zoneStats[z.name] || 0}
          active={activeZone === z.name}
          onClick={() => onChange(z.name)}
          color={ZONE_COLORS[i % ZONE_COLORS.length]}
        />
      ))}
    </div>
  )
}

function ZoneTab({ label, count, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[17px] font-bold transition focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 ${
        active
          ? 'border-[#f59e0b] bg-[#fff7e6] text-black shadow-[0_1px_4px_rgba(217,119,6,0.18)]'
          : 'border-white/80 bg-white/50 text-[#1f2937] shadow-[0_1px_2px_rgba(15,23,42,0.03),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur hover:border-[#b6c0d0] hover:text-black hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)]'
      }`}
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full transition group-hover:scale-110"
        style={{ backgroundColor: color, opacity: active ? 1 : 0.55 }}
      />
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[15px] font-bold leading-none ${
          active ? 'bg-[#f59e0b]/15 text-black' : 'bg-[#f1f5f9]/70 text-[#475569]'
        }`}
      >
        {count}
      </span>
    </button>
  )
}
