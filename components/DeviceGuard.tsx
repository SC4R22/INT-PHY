'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Generates a stable device fingerprint stored in localStorage.
 * Uses a combination of random values + browser traits for stability.
 */
function getOrCreateDeviceId(): string {
  const KEY = '__intphy_did'
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      // Include screen dimensions + timezone offset as part of the seed
      // so the same physical device tends to get the same ID even after
      // clearing storage (it'll regenerate but remain stable per browser profile)
      const seed = [
        navigator.hardwareConcurrency || 0,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
      ].join('-')
      id = `${seed}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
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

    if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) browser = 'Chrome'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
    else if (ua.includes('Edg')) browser = 'Edge'
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera'

    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'Mac'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iPhone')) os = 'iPhone'
    else if (ua.includes('iPad')) os = 'iPad'
    else if (ua.includes('Linux')) os = 'Linux'

    return `${browser} على ${os}`
  } catch {
    return 'جهاز غير معروف'
  }
}

interface DeviceInfo {
  name: string
  ip: string | null
  city: string | null
  country: string | null
  last_seen: string
  formatted: string
}

interface DeviceGuardProps {
  userRole: string
}

export function DeviceGuard({ userRole }: DeviceGuardProps) {
  const router = useRouter()
  const checked = useRef(false)
  const [blocked, setBlocked] = useState(false)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
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
          // Show the block UI instead of immediately redirecting
          setDevices(data.devices || [])
          setBlocked(true)
        }
        // 200 = allowed, do nothing
      })
      .catch(() => {
        // Network error — allow through silently to not block legitimate users
      })
  }, [userRole])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      // Sign out via Supabase client directly (no redirect side-effect)
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    // Redirect to login with the device limit flag
    const msg = encodeURIComponent(
      devices.length > 0
        ? `وصلت للحد الأقصى. الأجهزة المسجلة:\n${devices.map((d, i) => `${i + 1}. ${d.formatted}`).join('\n')}`
        : 'وصلت للحد الأقصى من الأجهزة (٢ أجهزة).'
    )
    router.replace(`/login?device_limit=1&msg=${msg}`)
  }

  if (!blocked) return null

  // Show a blocking overlay with device details
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          background: '#1a1a1a',
          border: '2px solid #f97316',
          borderRadius: '1rem',
          padding: '2rem',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          color: '#fff',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚫</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f97316', marginBottom: '0.75rem' }}>
          تم تسجيل خروجك
        </h2>
        <p style={{ color: '#d1d5db', marginBottom: '1.25rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
          وصلت للحد الأقصى (٢ أجهزة). الأجهزة المسجلة على حسابك:
        </p>

        {devices.length > 0 && (
          <div style={{ marginBottom: '1.5rem', textAlign: 'right' }}>
            {devices.map((device, i) => (
              <div
                key={i}
                style={{
                  background: '#2a2a2a',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  fontSize: '0.85rem',
                  lineHeight: 1.7,
                }}
              >
                <div style={{ fontWeight: 600, color: '#f3f4f6', marginBottom: '0.2rem' }}>
                  📱 الجهاز {i + 1}: {device.name}
                </div>
                {(device.city || device.country) && (
                  <div style={{ color: '#9ca3af' }}>
                    📍 {[device.city, device.country].filter(Boolean).join('، ')}
                  </div>
                )}
                {device.ip && (
                  <div style={{ color: '#6b7280', fontSize: '0.78rem' }}>
                    🌐 {device.ip}
                  </div>
                )}
                <div style={{ color: '#6b7280', fontSize: '0.78rem' }}>
                  🕐 آخر نشاط: {new Date(device.last_seen).toLocaleString('ar-EG')}
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
          لو محتاج تغيير الجهاز، تواصل مع الدعم.
        </p>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.75rem 2rem',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: signingOut ? 'not-allowed' : 'pointer',
            opacity: signingOut ? 0.7 : 1,
            width: '100%',
          }}
        >
          {signingOut ? 'جاري تسجيل الخروج...' : 'تسجيل الخروج'}
        </button>
      </div>
    </div>
  )
}
