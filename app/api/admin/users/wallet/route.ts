import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET  /api/admin/users/wallet?userId=xxx  — fetch balance + transactions
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const admin = createAdminClient()

  const [balRes, txRes] = await Promise.all([
    admin.from('wallet_balances').select('balance, updated_at').eq('user_id', userId).single(),
    admin
      .from('wallet_transactions')
      .select('id, amount, type, description, created_at, performed_by, courses(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return NextResponse.json({
    balance: balRes.data?.balance ?? 0,
    updatedAt: balRes.data?.updated_at ?? null,
    transactions: txRes.data ?? [],
  })
}

// POST /api/admin/users/wallet  — top up a user's wallet
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { userId, amount, description } = body

  if (!userId || !amount || isNaN(Number(amount)) || Number(amount) <= 0)
    return NextResponse.json({ error: 'userId and positive amount required' }, { status: 400 })

  const admin = createAdminClient()
  const parsedAmount = Number(amount)

  // Ensure wallet row exists
  await admin.from('wallet_balances').upsert(
    { user_id: userId, balance: 0, updated_at: new Date().toISOString() },
    { onConflict: 'user_id', ignoreDuplicates: true }
  )

  // Fetch current balance then increment
  const { data: current } = await admin
    .from('wallet_balances').select('balance').eq('user_id', userId).single()

  const newBalance = Number(current?.balance ?? 0) + parsedAmount

  const { error: updateErr } = await admin
    .from('wallet_balances')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Record transaction
  await admin.from('wallet_transactions').insert({
    user_id: userId,
    amount: parsedAmount,
    type: 'top_up',
    description: description || 'شحن محفظة من الأدمين',
    performed_by: user.id,
  })

  return NextResponse.json({ success: true, balance: newBalance })
}
