import { useState } from 'react'

/**
 * 仓库区域管理弹窗
 * mode: 'add'（新增区域）| 'rename'（重命名区域）
 */
export default function ZoneModal({ mode, zones, initial, onClose, onSubmit, busy }) {
  const isRename = mode === 'rename'
  const [title, setTitle] = useState(initial?.title || '')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const name = title.trim()
    if (!name) return setError('请输入区域名称')
    if (zones.some((z) => z.title === name && z.name !== initial?.name)) {
      return setError(`区域「${name}」已存在`)
    }
    onSubmit({ mode, title: name, name: initial?.name })
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
          <h2 className="text-[22px] font-extrabold text-black">
            {isRename ? '重命名区域' : '新增区域'}
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
          {isRename && (
            <p className="rounded-lg border border-[#eef1f6] bg-[#f8fafc] px-3 py-2 text-[18px] font-semibold text-[#334155]">
              当前区域：{initial?.title}
            </p>
          )}
          <div>
            <label className="mb-1 block text-[20px] font-bold text-[#475569]">
              {isRename ? '新区域名称' : '区域名称'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isRename ? '输入新的区域名称' : '如：成品七区'}
              autoFocus
              className="w-full rounded-lg border border-[#d7dee9] bg-white px-3 py-2 text-[20px] text-black outline-none transition focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20"
            />
            <p className="mt-1 text-[17px] text-[#94a3b8]">
              {isRename ? '重命名后，该区域下的所有货架与储位保持不变' : '新增区域会写入 Excel（新增一个工作表），并带一个默认货架'}
            </p>
          </div>

          {error && <p className="text-[18px] font-semibold text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#d7dee9] px-4 py-2 text-[20px] text-[#64748b] transition hover:border-[#b6c0d0] hover:text-[#334155]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#f59e0b] px-4 py-2 text-[20px] font-semibold text-white transition hover:bg-[#d97706] disabled:opacity-50"
            >
              {busy ? '处理中…' : isRename ? '保存' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
