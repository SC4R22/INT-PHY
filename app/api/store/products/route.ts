import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/store/products — public product listing (available + in stock)
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('store_products')
    .select('id, name, description, price, image_url, category, stock, is_available')
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data || [] })
}
