import { useState } from 'react'

/**
 * 货架管理弹窗
 * mode: 'rename'（重命名货架）
 */
export default function RackModal({ mode, initial, onClose, onSubmit, busy }) {
  const isRename = mode === 'rename'
  const [title, setTitle] = useState(initial?.rackName || '')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const name = title.trim()
    if (!name) return setError('请输入货架名称')
    if (name === initial?.rackName) return onClose() // 未修改，直接关闭
    onSubmit({ mode, sheetName: initial?.zoneName, rackName: initial?.rackName, newRackName: name })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="panel w-full max-w-md fade-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-[#eef1f6] px-5 py-3.5">
          <h2 className="text-[20px] font-extrabold text-black">重命名货架</h2>
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
          <p className="rounded-lg border border-[#eef1f6]/80 bg-white/50 px-3 py-2 text-[16px] font-semibold text-[#334155] backdrop-blur-sm">
            区域：{initial?.zoneName}　当前货架：{initial?.rackName}
          </p>
          <div>
            <label className="mb-1 block text-[18px] font-bold text-[#475569]">新货架名称</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入新的货架名称"
              autoFocus
              className="input"
            />
            <p className="mt-1 text-[15px] text-[#94a3b8]">重命名后，该货架下的所有储位与商品保持不变</p>
          </div>

          {error && <p className="text-[16px] font-semibold text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost px-4 py-2">
              取消
            </button>
            <button type="submit" disabled={busy} className="btn-primary px-4 py-2">
              {busy ? '处理中…' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
