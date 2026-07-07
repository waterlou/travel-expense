declare module 'fontkit' {
  export function create(data: ArrayBuffer): any
  export function registerFormat(format: any): void
  export function open(buffer: ArrayBuffer, postscriptName?: string): any
  export function openSync(filename: string, postscriptName?: string): any
}

declare module 'fontkit/dist/browser-module.mjs' {
  const fontkit: {
    create: (data: ArrayBuffer) => any
    registerFormat: (format: any) => void
    open: (buffer: ArrayBuffer, postscriptName?: string) => any
    defaultLanguage?: string
  }
  export default fontkit
}
