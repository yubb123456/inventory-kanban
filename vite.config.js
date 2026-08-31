import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // 相对路径，适配 GitHub Pages 任意子路径部署
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true, // 允许任意 host 访问（含公网隧道随机域名），关闭 DNS rebinding 校验
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
        // SSE 长连接：关闭代理层超时，避免实时推送连接被断开
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
})
