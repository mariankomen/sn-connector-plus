declare global {
    interface Window {
        g_ck?: string
    }
}

// handles importing scss as modules
declare module '*.scss' {
    const content: string
    export default content
}
