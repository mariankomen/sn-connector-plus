import ReactDOM from 'react-dom/client'
import type { Root } from 'react-dom/client'
import App from './App'

type PeekloCtx = {
  table: string | null
  sys_id: string | null
  topHref: string
  decodedTarget: string | null
  uri: string | null
}

let root: Root | null = null

function decodeSafe(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function parseParams(urlOrQuery: string) {
  try {
    const u = new URL(urlOrQuery, window.location.origin)
    return u.searchParams
  } catch {
    return new URLSearchParams(urlOrQuery.split('?')[1] || urlOrQuery)
  }
}

function guessTableFromString(s: string) {
  const m = s.match(/(?:\/|^)([a-z0-9_]+)\.do\b/i)
  return m ? m[1] : null
}

function extractEncodedTargetFromClassicNav(href: string): string | null {
  const m = href.match(/\/now\/nav\/ui\/classic\/params\/target\/([^?#]+)/i)
  return m ? m[1] : null
}

function getCtxFromUrl(): PeekloCtx {
  const topHref =
    (window.top && window.top.location && window.top.location.href) ||
    window.location.href

  let p = parseParams(topHref)
  let sys_id = p.get('sys_id')

  const uriRaw = p.get('uri')
  const uri = uriRaw ? decodeSafe(uriRaw) : null
  if (!sys_id && uri) {
    const p2 = parseParams(uri)
    sys_id = p2.get('sys_id')
  }
  let decodedTarget: string | null = null
  const encodedTarget = extractEncodedTargetFromClassicNav(topHref)
  if (!sys_id && encodedTarget) {
    decodedTarget = decodeSafe(encodedTarget)
    const p3 = parseParams(decodedTarget)
    sys_id = p3.get('sys_id')
  }

  let table = guessTableFromString(topHref)
  if ((!table || table === 'nav_to') && uri) table = guessTableFromString(uri)
  if ((!table || table === 'now') && decodedTarget) table = guessTableFromString(decodedTarget)

  if (!table && decodedTarget) table = guessTableFromString(decodedTarget)

  return { table, sys_id, topHref, decodedTarget, uri }
}

function setGlobalCtx(ctx: PeekloCtx) {
  ;(window as any).__PEEKLO_CTX = ctx
  try {
    if (window.top) (window.top as any).__PEEKLO_CTX = ctx
  } catch {}
}

function mount(el: Element) {
  if (root) root.unmount()

  const ctx = getCtxFromUrl()
  setGlobalCtx(ctx)

  root = ReactDOM.createRoot(el)
  root.render(<App ctx={ctx} />)
}

function unmount() {
  root?.unmount()
  root = null
}

;(window as any).PeekloModal = { mount, unmount }
;(window as any).__peeklo_bundle_loaded = true
console.log('[PEEKLO] bundle executed')




















































































