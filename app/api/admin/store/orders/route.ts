import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') return null
  return createAdminClient()
}

// GET /api/admin/store/orders — list all orders with user + product info
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const status = req.nextUrl.searchParams.get('status')

  let query = admin
    .from('store_orders')
    .select(`
      id, quantity, unit_price, total, payment_method, status,
      delivery_name, delivery_phone, delivery_address, notes, created_at,
      user_profiles!user_id (id, full_name, phone_number),
      store_products!product_id (id, name, image_url)
    `)
    .order('created_at', { ascending: false })

  if (status) query = (query as any).eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data })
}
