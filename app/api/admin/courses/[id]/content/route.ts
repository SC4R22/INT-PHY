import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' || profile?.role === 'teacher' ? user : null
}

// GET /api/admin/courses/[id]/content — fetch course, modules, videos, files
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: courseId } = await params
  const admin = createAdminClient()

  const { data: course, error: courseErr } = await admin
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 500 })

  const { data: modulesData, error: modulesErr } = await admin
    .from('modules')
    .select('*, videos(*)')
    .eq('course_id', courseId)
    .order('order_index')

  if (modulesErr) return NextResponse.json({ error: modulesErr.message }, { status: 500 })

  const moduleIds = (modulesData ?? []).map((m: any) => m.id)
  let filesMap: Record<string, any[]> = {}
  if (moduleIds.length > 0) {
    const { data: filesData } = await admin
      .from('module_files')
      .select('*')
      .in('module_id', moduleIds)
      .order('order_index')
    if (filesData) {
      for (const f of filesData) {
        if (!filesMap[f.module_id]) filesMap[f.module_id] = []
        filesMap[f.module_id].push(f)
      }
    }
  }

  const modules = (modulesData ?? []).map((mod: any) => ({
    ...mod,
    videos: [...(mod.videos ?? [])].sort(
      (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
    ),
    files: filesMap[mod.id] ?? [],
  }))

  return NextResponse.json({ course, modules })
}

// POST /api/admin/courses/[id]/content — handle all mutations
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: courseId } = await params
  const admin = createAdminClient()
  const body = await req.json()
  const { action } = body

  // ── Add Module ──
  if (action === 'addModule') {
    const { title, orderIndex } = body
    const { error } = await admin.from('modules').insert({
      course_id: courseId,
      title,
      order_index: orderIndex,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Delete Module ──
  if (action === 'deleteModule') {
    const { moduleId } = body
    const { error } = await admin.from('modules').delete().eq('id', moduleId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Add Video ──
  if (action === 'addVideo') {
    const { moduleId, title, orderIndex, videoUrl, duration, muxAssetId, muxPlaybackId } = body
    const payload: any = { module_id: moduleId, title, order_index: orderIndex }
    if (videoUrl) { payload.video_url = videoUrl; payload.duration = duration ?? null }
    if (muxAssetId) {
      payload.mux_asset_id = muxAssetId
      payload.mux_playback_id = muxPlaybackId
      payload.duration = duration ?? null
    }
    const { error } = await admin.from('videos').insert(payload)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Delete Video ──
  if (action === 'deleteVideo') {
    const { videoId } = body
    const { error } = await admin.from('videos').delete().eq('id', videoId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Add File (db record only — upload happens client-side to Storage) ──
  if (action === 'addFile') {
    const { moduleId, name, fileUrl, fileSize, fileType, orderIndex } = body
    const { error } = await admin.from('module_files').insert({
      module_id: moduleId,
      name,
      file_url: fileUrl,
      file_size: fileSize,
      file_type: fileType,
      order_index: orderIndex,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Delete File ──
  if (action === 'deleteFile') {
    const { fileId } = body
    const { error } = await admin.from('module_files').delete().eq('id', fileId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
