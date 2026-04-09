import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/users/wallet/balance — student reads their OWN wallet balance
// (different from /api/admin/users/wallet which is admin-only)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ balance: null }, { status: 401 })

  const { data } = await supabase
    .from('wallet_balances')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ balance: data ? Number(data.balance) : 0 })
}
