import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEVICE_LIMIT = 2

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

    // Check if this device is already registered for this user
    const { data: existingDevice } = await supabase
      .from('user_device_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('device_id', deviceId)
      .single()

    if (existingDevice) {
      // Known device — just refresh last_seen
      await supabase
        .from('user_device_sessions')
        .update({ last_seen: new Date().toISOString(), device_name: deviceName || null })
        .eq('user_id', user.id)
        .eq('device_id', deviceId)

      return NextResponse.json({ allowed: true })
    }

    // New device — check how many active devices this user already has
    // First clean up stale sessions (30 days) and count
    const { data: countResult } = await supabase
      .rpc('get_active_device_count', { p_user_id: user.id })

    const activeCount = (countResult as number) ?? 0

    if (activeCount >= DEVICE_LIMIT) {
      // Fetch the device names so we can show them in the error message
      const { data: devices } = await supabase
        .from('user_device_sessions')
        .select('device_name, last_seen')
        .eq('user_id', user.id)
        .order('last_seen', { ascending: false })

      const deviceList = (devices || [])
        .map((d: any) => d.device_name || 'جهاز غير معروف')
        .join('، ')

      return NextResponse.json({
        allowed: false,
        reason: 'device_limit',
        message: `وصلت للحد الأقصى (${DEVICE_LIMIT} أجهزة). الأجهزة المسجلة: ${deviceList}`,
        devices: devices || [],
      }, { status: 403 })
    }

    // Register the new device
    await supabase
      .from('user_device_sessions')
      .insert({
        user_id: user.id,
        device_id: deviceId,
        device_name: deviceName || null,
        last_seen: new Date().toISOString(),
      })

    return NextResponse.json({ allowed: true })
  } catch (error: any) {
    console.error('Device check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
