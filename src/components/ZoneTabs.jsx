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
    <div className="flex flex-wrap gap-2">
      <ZoneTab
        label={allLabel}
        count={allCount}
        active={activeZone === '__all__'}
        onClick={() => onChange('__all__')}
      />
      {zonesSorted.map((z) => (
        <ZoneTab
          key={z.name}
          label={z.title}
          count={zoneStats[z.name] || 0}
          active={activeZone === z.name}
          onClick={() => onChange(z.name)}
        />
      ))}
    </div>
  )
}

function ZoneTab({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[18px] font-bold transition focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/30 ${
        active
          ? 'border-[#f59e0b] bg-[#fff7e6] text-black'
          : 'border-[#d7dee9] bg-white text-[#1f2937] hover:border-[#b6c0d0] hover:text-black'
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[15px] font-bold leading-none ${
          active ? 'bg-[#f59e0b]/15 text-black' : 'bg-[#f1f5f9] text-[#475569]'
        }`}
      >
        {count}
      </span>
    </button>
  )
}
