import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** Verify the caller is an admin — returns the admin supabase client if OK */
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null
  return user
}

/** GET /api/admin/users/devices?userId=xxx — list all device sessions for a user */
export async function GET(request: NextRequest) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const admin = createAdminClient()

  const { data: devices, error } = await admin
    .from('user_device_sessions')
    .select('id, device_id, device_name, ip_address, city, country, last_seen, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ devices: devices || [] })
}

/**
 * DELETE /api/admin/users/devices
 *
 * Body: { userId, deviceId? }
 *
 * - If deviceId is provided: disconnect only that one device (removes from our
 *   tracking table only — the user's auth session stays alive, they just free
 *   up that device slot).
 *
 * - If no deviceId: FULL FORCE SIGN-OUT — deletes auth.sessions,
 *   auth.refresh_tokens, AND our device tracking rows. The user's browser
 *   cookies become invalid and they must log in again from scratch.
 */
export async function DELETE(request: NextRequest) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const { userId, deviceId } = body

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const admin = createAdminClient()

  if (deviceId) {
    // ── Single device disconnect ──────────────────────────────────────────
    // Just remove it from our tracking table so the slot is freed.
    // We don't kill their auth session — they may still be logged in on other
    // devices and we only want to free this one slot.
    const { error } = await admin
      .from('user_device_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', deviceId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, mode: 'single' })
  }

  // ── Full force sign-out ───────────────────────────────────────────────────
  // Call our SECURITY DEFINER function which:
  //   1. Deletes auth.refresh_tokens (invalidates all tokens)
  //   2. Deletes auth.sessions (kills all active sessions)
  //   3. Deletes user_device_sessions (clears device limit so they can re-login)
  const { error } = await admin.rpc('admin_force_signout_user', { p_user_id: userId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, mode: 'force_signout' })
}
