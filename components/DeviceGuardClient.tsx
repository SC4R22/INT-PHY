'use client'

/**
 * Client-side wrapper for DeviceGuard.
 *
 * next/dynamic with ssr:false is only permitted inside Client Components.
 * This wrapper lives in a 'use client' file so it can safely use ssr:false,
 * while the Server Component layout (app/dashboard/layout.tsx) imports this
 * wrapper instead of DeviceGuard directly.
 */

import dynamic from 'next/dynamic'
import { Component, type ReactNode } from 'react'

const DeviceGuard = dynamic(
  () => import('@/components/DeviceGuard').then((m) => {
    if (!m?.DeviceGuard) throw new Error('DeviceGuard chunk failed to load')
    return { default: m.DeviceGuard }
  }),
  { ssr: false, loading: () => null }
)

interface DeviceGuardClientProps {
  userRole: string
}

// Catches Webpack chunk-load errors ("Cannot read properties of undefined
// (reading 'call')") and does a single automatic hard-reload to recover.
interface EBState { crashed: boolean }
class ChunkErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(error: Error) {
    const isChunkError =
      error?.message?.includes('call') ||
      error?.message?.includes('chunk') ||
      error?.name === 'ChunkLoadError'

    if (isChunkError && typeof window !== 'undefined') {
      // Use a timestamp-based key stored in sessionStorage.
      // If site data was cleared, sessionStorage is also cleared — so the
      // guard resets automatically and we can reload once more.
      // To prevent infinite reload loops, we track the reload timestamp and
      // refuse to reload again within a 5-second window.
      const key = '__chunk_reload_ts__'
      try {
        const last = sessionStorage.getItem(key)
        const now = Date.now()
        const COOLDOWN_MS = 5000

        if (!last || now - parseInt(last, 10) > COOLDOWN_MS) {
          sessionStorage.setItem(key, String(now))
          window.location.reload()
        }
        // else: we already reloaded recently — degrade silently (render null)
      } catch {
        // sessionStorage blocked (e.g. private mode) — just reload once
        window.location.reload()
      }
    }
  }

  render() {
    if (this.state.crashed) return null
    return this.props.children
  }
}

export function DeviceGuardClient({ userRole }: DeviceGuardClientProps) {
  return (
    <ChunkErrorBoundary>
      <DeviceGuard userRole={userRole} />
    </ChunkErrorBoundary>
  )
}
