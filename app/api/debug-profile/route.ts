import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const results: Record<string, any> = {}

  // 1. Check env vars are present (not their values)
  results.env = {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30),
    serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20),
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
  }

  // 2. Check auth session from server
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    results.auth = {
      userId: user?.id ?? null,
      email: user?.email ?? null,
      error: error?.message ?? null,
    }
  } catch (e: any) {
    results.auth = { exception: e?.message }
  }

  // 3. Test admin client directly
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('user_profiles')
      .select('id, full_name, role')
      .limit(5)
    results.adminQuery = {
      rows: data,
      error: error?.message ?? null,
      errorCode: (error as any)?.code ?? null,
    }
  } catch (e: any) {
    results.adminQuery = { exception: e?.message }
  }

  // 4. If we have a user, try fetching their profile specifically
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      results.userProfile = { data, error: error?.message ?? null }
    } else {
      results.userProfile = { skipped: 'no authenticated user' }
    }
  } catch (e: any) {
    results.userProfile = { exception: e?.message }
  }

  return NextResponse.json(results)
}
