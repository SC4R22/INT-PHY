'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Generates a stable device fingerprint stored in localStorage.
 * Not 100% foolproof but sufficient to distinguish real devices.
 */
function getOrCreateDeviceId(): string {
  const KEY = '__intphy_did'
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      // Create a random ID tied to this browser/device
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    // Private mode / storage blocked — generate ephemeral ID
    return `eph-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

/**
 * Build a human-readable device name from browser UA
 */
function getDeviceName(): string {
  try {
    const ua = navigator.userAgent
    let browser = 'Browser'
    let os = 'Unknown OS'

    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
    else if (ua.includes('Edg')) browser = 'Edge'
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera'

    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'Mac'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
    else if (ua.includes('Linux')) os = 'Linux'

    return `${browser} على ${os}`
  } catch {
    return 'جهاز غير معروف'
  }
}

interface DeviceGuardProps {
  /** Pass the user's role so we skip the check for admins/teachers */
  userRole: string
}

export function DeviceGuard({ userRole }: DeviceGuardProps) {
  const router = useRouter()
  const checked = useRef(false)

  useEffect(() => {
    // Only run once per mount, and skip for admins/teachers
    if (checked.current) return
    if (userRole === 'admin' || userRole === 'teacher') return
    checked.current = true

    const deviceId = getOrCreateDeviceId()
    const deviceName = getDeviceName()

    fetch('/api/device-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, deviceName }),
    })
      .then(async (res) => {
        if (res.status === 403) {
          const data = await res.json()
          // Sign out and redirect with error message
          await fetch('/api/auth/signout', { method: 'POST' })
          const msg = encodeURIComponent(data.message || 'تم تسجيل الخروج بسبب تجاوز حد الأجهزة')
          router.replace(`/login?device_limit=1&msg=${msg}`)
        }
        // 200 = allowed, do nothing
      })
      .catch(() => {
        // Network error — allow through silently to not block legitimate users
      })
  }, [userRole, router])

  return null
}
