import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SignJWT, importPKCS8 } from 'jose'

const MUX_SIGNING_KEY_ID = process.env.MUX_SIGNING_KEY_ID
const MUX_SIGNING_PRIVATE_KEY = process.env.MUX_SIGNING_PRIVATE_KEY

// Token valid for 2 hours — enough for any single study session
const TOKEN_EXPIRY = '2h'

export async function GET(request: Request) {
  try {
    // ── 1. Auth check ────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Validate query params ─────────────────────────────────────────────
    const { searchParams } = new URL(request.url)
    const playbackId = searchParams.get('playbackId')
    const videoId = searchParams.get('videoId')

    if (!playbackId || !videoId) {
      return NextResponse.json({ error: 'Missing playbackId or videoId' }, { status: 400 })
    }

    // ── 3. Verify the video exists and belongs to a course ───────────────────
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        mux_playback_id,
        modules:module_id (
          course_id
        )
      `)
      .eq('id', videoId)
      .eq('mux_playback_id', playbackId)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const mod = video.modules as any
    const courseId = mod?.course_id

    if (!courseId) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // ── 4. Verify enrollment (admins/teachers bypass this check) ────────────
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isStaff = profile?.role === 'admin' || profile?.role === 'teacher'

    if (!isStaff) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single()

      if (!enrollment) {
        return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })
      }
    }

    // ── 5. Generate Mux signed JWT ───────────────────────────────────────────
    // If signing keys are not configured, fall back to unsigned public playback.
    // This allows videos uploaded as "public" in Mux to still work.
    if (!MUX_SIGNING_KEY_ID || !MUX_SIGNING_PRIVATE_KEY) {
      console.warn('Mux signing keys not configured — returning unsigned token fallback')
      return NextResponse.json({ token: null, unsigned: true })
    }

    // The private key from Mux dashboard is base64-encoded PKCS8
    let privateKeyPem: string
    try {
      privateKeyPem = Buffer.from(MUX_SIGNING_PRIVATE_KEY, 'base64').toString('utf8')
      if (!privateKeyPem.includes('-----BEGIN')) {
        throw new Error('Decoded key does not look like a PEM — check MUX_SIGNING_PRIVATE_KEY encoding')
      }
    } catch (err) {
      console.error('Failed to decode Mux private key:', err)
      return NextResponse.json({ token: null, unsigned: true })
    }

    const privateKey = await importPKCS8(privateKeyPem, 'RS256')

    const token = await new SignJWT({
      sub: playbackId,
      aud: 'v',           // 'v' = video playback audience
      kid: MUX_SIGNING_KEY_ID,
      uid: user.id,       // Tie token to this specific user
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: MUX_SIGNING_KEY_ID })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(privateKey)

    return NextResponse.json({ token })
  } catch (err: any) {
    console.error('Signed URL error:', err?.message ?? err)
    return NextResponse.json({ error: 'Failed to generate signed token', detail: err?.message ?? String(err) }, { status: 500 })
  }
}
