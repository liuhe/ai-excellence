import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { marked } from 'marked'
import type { Connect } from 'vite'

// 把 public/ 下的 .md 静态文件渲染为带样式的 HTML 页面再返回。
// 解决两个问题：
//   1. 直接 serve raw markdown 时浏览器没法做 markdown 渲染，且 Content-Type 缺 charset 导致中文乱码
//   2. rule.content / notes 里的 markdown 链接点进来能看到一份可读的页面
function markdownAsHtml() {
  return {
    name: 'serve-md-as-html',
    configureServer(server: { middlewares: Connect.Server; config: { root: string } }) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (!url || !url.endsWith('.md')) return next()
        try {
          const filePath = resolve(server.config.root, 'public' + decodeURIComponent(url))
          const content = await readFile(filePath, 'utf-8')
          const body = await marked.parse(content)
          const styled = `<!doctype html><html><head><meta charset="utf-8"><title>${url}</title>
<style>
body{max-width:920px;margin:2em auto;padding:0 1.5em;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;line-height:1.65;color:#1e293b;background:#fff}
h1,h2,h3,h4{margin-top:1.6em;margin-bottom:.6em;color:#0f172a}
h1{font-size:1.75em;border-bottom:1px solid #e2e8f0;padding-bottom:.3em}
h2{font-size:1.4em}
h3{font-size:1.15em}
code{background:#f1f5f9;padding:.1em .35em;border-radius:3px;font-size:.92em;font-family:ui-monospace,SFMono-Regular,monospace}
pre{background:#0f172a;color:#e2e8f0;padding:1em;border-radius:6px;overflow-x:auto;line-height:1.4}
pre code{background:none;color:inherit;padding:0;font-size:.88em}
a{color:#2563eb;text-decoration:none}
a:hover{text-decoration:underline}
blockquote{border-left:3px solid #cbd5e1;padding-left:1em;color:#64748b;margin:1em 0}
table{border-collapse:collapse;margin:1em 0}
td,th{border:1px solid #cbd5e1;padding:.4em .8em}
th{background:#f8fafc}
ul,ol{padding-left:1.5em}
li{margin:.2em 0}
img{max-width:100%}
hr{border:none;border-top:1px solid #e2e8f0;margin:2em 0}
</style></head><body>${body}</body></html>`
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(styled)
        } catch {
          next()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), markdownAsHtml()],
  server: {
    fs: {
      // public/ 下软链常指向受管工程的真实位置（任意路径），
      // 默认的 fs.strict 会阻止 Vite 服务工作区外的文件，导致软链子目录读不到。
      // 本地 dev viewer 风险可控，关闭严格检查。
      strict: false,
    },
  },
})
