import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID!
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET!
const MUX_AUTH = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')

export async function GET(request: Request) {
  // Auth check — only admins/teachers can poll upload status
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'teacher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const uploadId = searchParams.get('uploadId')
  if (!uploadId) return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 })

  // Check the upload status on Mux
  const res = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
    headers: { Authorization: `Basic ${MUX_AUTH}` },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to check upload status' }, { status: 500 })
  }

  const { data } = await res.json()

  // data.status is one of: waiting, asset_created, errored, cancelled, timed_out
  // data.asset_id is set once the asset has been created
  if (data.status !== 'asset_created' || !data.asset_id) {
    return NextResponse.json({ status: data.status, ready: false })
  }

  // Now fetch the asset to get its playback_id and duration
  const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${data.asset_id}`, {
    headers: { Authorization: `Basic ${MUX_AUTH}` },
  })

  if (!assetRes.ok) {
    return NextResponse.json({ status: 'asset_created', ready: false })
  }

  const { data: asset } = await assetRes.json()

  // asset.status is one of: preparing, ready, errored
  if (asset.status !== 'ready') {
    return NextResponse.json({ status: asset.status, ready: false })
  }

  const playbackId = asset.playback_ids?.[0]?.id ?? null
  const durationSeconds = asset.duration ? Math.round(asset.duration) : null

  return NextResponse.json({
    ready: true,
    status: 'ready',
    assetId: data.asset_id,
    playbackId,
    duration: durationSeconds,
  })
}
