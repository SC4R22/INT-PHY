import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PAGE_SIZE = 50

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS-scoped read — user reads their own profile row, no admin client needed for auth check
  const { data: caller } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get('page') || '0'))
  const search = req.nextUrl.searchParams.get('search')?.trim() || ''

  // Admin client required here to read all users (bypasses RLS intentionally)
  const admin = createAdminClient()

  let query = admin
    .from('user_profiles')
    .select('id, full_name, phone_number, role, created_at, is_banned', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone_number.ilike.%${search}%`)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    users: data || [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  })
}
