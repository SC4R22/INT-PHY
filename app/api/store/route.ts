import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/store — place an order
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    product_id,
    quantity = 1,
    payment_method,
    delivery_name,
    delivery_phone,
    delivery_address,
    notes,
    access_code,
  } = body

  if (!product_id || !payment_method || !delivery_name || !delivery_phone || !delivery_address)
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })

  if (!['wallet', 'code'].includes(payment_method))
    return NextResponse.json({ error: 'طريقة دفع غير صالحة' }, { status: 400 })

  // For code payments: validate access code format (basic check)
  if (payment_method === 'code' && !access_code?.trim())
    return NextResponse.json({ error: 'يجب إدخال كود الدفع' }, { status: 400 })

  const { data, error } = await supabase.rpc('place_store_order', {
    p_product_id: product_id,
    p_user_id: user.id,
    p_quantity: quantity,
    p_payment_method: payment_method,
    p_delivery_name: delivery_name,
    p_delivery_phone: delivery_phone,
    p_delivery_address: delivery_address,
    p_notes: notes || null,
    p_access_code: access_code || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = data as { success: boolean; error?: string; order_id?: string; total?: number; balance?: number; required?: number; stock?: number }

  if (!result.success)
    return NextResponse.json({
      error: result.error,
      balance: result.balance,
      required: result.required,
      stock: result.stock,
    }, { status: 400 })

  return NextResponse.json({ success: true, order_id: result.order_id, total: result.total })
}

// GET /api/store/my-orders — student's own orders
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('store_orders')
    .select(`
      id, quantity, unit_price, total, payment_method, status,
      delivery_name, delivery_address, created_at,
      store_products!product_id (id, name, image_url)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data })
}
