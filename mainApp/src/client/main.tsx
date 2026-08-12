import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app'

const ROOT_KEY = '__xPeeklSalesfor0ReactRoot__'

const mountReactApp = () => {
    const container = document.getElementById('root')
    if (!container) {
        return
    }

    const win = window as Window & Record<string, ReturnType<typeof ReactDOM.createRoot> | undefined>
    if (win[ROOT_KEY]) {
        return
    }

    const root = ReactDOM.createRoot(container)
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    )
    win[ROOT_KEY] = root
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountReactApp, { once: true })
} else {
    mountReactApp()
}
