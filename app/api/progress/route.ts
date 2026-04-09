import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[progress] auth failed:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { video_id, last_position, completed, duration } = body

    if (!video_id || last_position === undefined || completed === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Save progress
    const { error } = await supabase
      .from('user_progress')
      .upsert(
        {
          user_id: user.id,
          video_id,
          last_position: Math.floor(last_position),
          completed,
          last_watched_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,video_id' }
      )

    if (error) {
      console.error('[progress] upsert error:', error.message, error.code)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If duration was provided and the video doesn't have one stored yet, save it.
    // This backfills duration for YouTube videos (which don't have it at upload time).
    if (duration && duration > 0) {
      await supabase
        .from('videos')
        .update({ duration: Math.floor(duration) })
        .eq('id', video_id)
        .is('duration', null)  // only update if not already set — never overwrite
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[progress] unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
