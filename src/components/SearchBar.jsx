export default function SearchBar({ query, onChange, matchCount, slotCount }) {
  return (
    <div className="relative w-full md:w-96">
      <div className="pointer-events-none absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-white/50">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-[#64748b]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索编码或型号，定位到储位…"
        className="input w-full rounded-xl py-2 pl-12 pr-20 text-[18px] font-semibold text-black placeholder-[#a0aaba] shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_2px_rgba(15,23,42,0.02)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.18),0_2px_6px_rgba(217,119,6,0.1)]"
        aria-label="搜索商品编码或型号"
      />
      {query.trim() && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#334155]"
          aria-label="清空搜索"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      {matchCount !== null && (
        <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 rounded-md bg-[#fff7e6] px-1.5 py-0.5 text-[15px] font-bold text-[#b45309]">
          {matchCount}项
        </span>
      )}
    </div>
  )
}
