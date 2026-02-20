import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID!
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET!
const MUX_AUTH = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')

export async function POST() {
  // Auth check — only admins/teachers can upload
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

  // Ask Mux for a direct upload URL
  // The video goes straight from the browser to Mux — never through this server
  const res = await fetch('https://api.mux.com/video/v1/uploads', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${MUX_AUTH}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cors_origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      new_asset_settings: {
        playback_policy: ['signed'],
        encoding_tier: 'baseline', // cheapest tier, good for educational content
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Mux upload error:', err)
    return NextResponse.json({ error: 'Failed to create Mux upload URL' }, { status: 500 })
  }

  const { data } = await res.json()

  // data.url  — the direct upload URL the browser will PUT to
  // data.id   — the upload ID (used to poll for status)
  return NextResponse.json({
    uploadUrl: data.url,
    uploadId: data.id,
  })
}
