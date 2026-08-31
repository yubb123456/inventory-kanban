export default function SearchBar({ query, onChange, matchCount, slotCount }) {
  return (
    <div className="relative w-full md:w-96">
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜索编码或型号，定位到储位…"
        className="w-full rounded-lg border border-[#d7dee9] bg-white py-2.5 pl-10 pr-16 text-[20px] font-semibold text-black placeholder-[#a0aaba] outline-none transition focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20"
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
        <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 text-[18px] text-[#94a3b8]">
          {matchCount}项
        </span>
      )}
    </div>
  )
}
