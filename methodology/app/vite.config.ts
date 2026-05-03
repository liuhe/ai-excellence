import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // public/ 下软链常指向受管工程的真实位置（任意路径），
      // 默认的 fs.strict 会阻止 Vite 服务工作区外的文件，导致软链子目录读不到。
      // 本地 dev viewer 风险可控，关闭严格检查。
      strict: false,
    },
  },
})
