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

// POST /api/admin/courses/[id]/upload
// Receives the file as multipart/form-data, uploads to Storage using the admin client
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: courseId } = await params

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const moduleId = formData.get('moduleId') as string | null
  const fileName = formData.get('fileName') as string | null

  if (!file || !moduleId || !fileName) {
    return NextResponse.json({ error: 'Missing file, moduleId, or fileName' }, { status: 400 })
  }

  const admin = createAdminClient()

  const ext = file.name.split('.').pop()
  const filePath = `${moduleId}/${Date.now()}-${fileName.trim().replace(/\s+/g, '-')}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadErr } = await admin.storage
    .from('module-files')
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage
    .from('module-files')
    .getPublicUrl(filePath)

  return NextResponse.json({ publicUrl, filePath })
}
