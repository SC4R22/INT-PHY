import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/wallet/purchase — student buys a course using wallet balance
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courseId } = await req.json()
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  const { data, error } = await supabase.rpc('purchase_course_with_wallet', {
    p_course_id: courseId,
    p_user_id: user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = data as { success: boolean; error?: string; balance?: number; required?: number }
  if (!result.success) {
    return NextResponse.json({ error: result.error, balance: result.balance, required: result.required }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

// GET /api/wallet/purchase?courseId=xxx — check wallet balance vs course price
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  const [balRes, courseRes] = await Promise.all([
    supabase.from('wallet_balances').select('balance').eq('user_id', user.id).single(),
    supabase.from('courses').select('price_cash, is_free').eq('id', courseId).single(),
  ])

  return NextResponse.json({
    balance: Number(balRes.data?.balance ?? 0),
    price: Number(courseRes.data?.price_cash ?? 0),
    isFree: courseRes.data?.is_free ?? false,
    canAfford:
      !courseRes.data?.is_free &&
      Number(balRes.data?.balance ?? 0) >= Number(courseRes.data?.price_cash ?? 0),
  })
}
