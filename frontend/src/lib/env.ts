const DEV_API = 'http://localhost:4000'

/** Server-side / SSR — direct backend URL */
export function getServerApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? DEV_API
}

/** Browser REST — direct backend URL when configured (matches Socket.io). */
export function getClientApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')
  if (configured) return configured
  if (typeof window !== 'undefined') return ''
  return getServerApiUrl()
}

/** Socket.io must connect directly to the backend (WebSockets are not proxied). */
export function getSocketUrl(): string {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '')
  if (url) return url
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SOCKET_URL is required in production')
  }
  return DEV_API
}
