import { useState } from 'react'

/**
 * 管理模式访问码验证弹窗
 * 查看开放，进入管理模式（增删改）需输入固定访问码
 */
export default function ManageCodeModal({ onSubmit, onClose }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(code, (ok) => {
      if (!ok) setError('访问码不正确，请重试')
    })
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
          <h2 className="text-[20px] font-extrabold text-black">验证访问码</h2>
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
            管理模式可添加 / 编辑 / 删除商品，改动会实时写回 Excel。请输入访问码后开启。
          </p>
          <div>
            <label className="mb-1 block text-[18px] font-bold text-[#475569]">访问码</label>
            <input
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setError('')
              }}
              placeholder="请输入访问码"
              autoFocus
              className="input"
            />
          </div>

          {error && <p className="text-[16px] font-semibold text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost px-4 py-2">
              取消
            </button>
            <button type="submit" className="btn-primary px-4 py-2">
              验证并开启
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
