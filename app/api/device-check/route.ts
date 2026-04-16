import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEVICE_LIMIT = 2

/** Extract the real client IP from the request headers */
function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? null
}

/** Attempt a lightweight geo-lookup using ip-api.com (free, no key required) */
async function getGeoLocation(ip: string | null): Promise<{ city: string | null; country: string | null }> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return { city: null, country: null }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return { city: null, country: null }
    const data = await res.json()
    if (data.status !== 'success') return { city: null, country: null }
    return { city: data.city ?? null, country: data.country ?? null }
  } catch {
    return { city: null, country: null }
  }
}

/** Format a device row into a readable Arabic string */
function formatDevice(d: {
  device_name: string | null
  ip_address: string | null
  city: string | null
  country: string | null
  created_at: string
}): string {
  const name = d.device_name || 'جهاز غير معروف'
  const location = [d.city, d.country].filter(Boolean).join('، ')
  const ip = d.ip_address ? ` (${d.ip_address})` : ''
  const loc = location ? ` — ${location}` : ''
  const registered = new Date(d.created_at).toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
  return `${name}${ip}${loc} — مسجل منذ ${registered}`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admins and teachers have no device limit
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin' || profile?.role === 'teacher') {
      return NextResponse.json({ allowed: true })
    }

    const { deviceId, deviceName } = await request.json()

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
    }

    // Get the real IP of this request
    const ip = getClientIp(request)

    // Check if this device is already registered for this user
    const { data: existingDevice } = await supabase
      .from('user_device_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('device_id', deviceId)
      .single()

    if (existingDevice) {
      // Known device — just refresh last_seen and update IP
      await supabase
        .from('user_device_sessions')
        .update({
          last_seen: new Date().toISOString(),
          device_name: deviceName || null,
          ip_address: ip,
        })
        .eq('user_id', user.id)
        .eq('device_id', deviceId)

      return NextResponse.json({ allowed: true })
    }

    // New device — get current active devices (also cleans stale ones)
    const { data: activeDevices } = await supabase
      .rpc('get_user_devices', { p_user_id: user.id })

    const devices = (activeDevices as any[]) ?? []

    if (devices.length >= DEVICE_LIMIT) {
      // Build a rich device list for display
      const deviceList = devices.map((d: any) => ({
        name: d.device_name || 'جهاز غير معروف',
        ip: d.ip_address || null,
        city: d.city || null,
        country: d.country || null,
        last_seen: d.last_seen,
        created_at: d.created_at,
        formatted: formatDevice(d),
      }))

      const deviceListText = deviceList
        .map((d, i) => `الجهاز ${i + 1}: ${d.formatted}`)
        .join('\n')

      return NextResponse.json({
        allowed: false,
        reason: 'device_limit',
        message: `وصلت للحد الأقصى (${DEVICE_LIMIT} أجهزة مسجلة).\n${deviceListText}`,
        devices: deviceList,
        limit: DEVICE_LIMIT,
      }, { status: 403 })
    }

    // New device is within limit — look up its geo-location and register it
    const { city, country } = await getGeoLocation(ip)

    await supabase
      .from('user_device_sessions')
      .insert({
        user_id: user.id,
        device_id: deviceId,
        device_name: deviceName || null,
        last_seen: new Date().toISOString(),
        ip_address: ip,
        city,
        country,
      })

    return NextResponse.json({ allowed: true })
  } catch (error: any) {
    console.error('Device check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
