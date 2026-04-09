'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category: string
  stock: number
  is_available: boolean
}

interface Order {
  id: string
  quantity: number
  total: number
  payment_method: string
  status: string
  delivery_address: string
  created_at: string
  store_products: { name: string; image_url: string | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'قيد الانتظار',
  confirmed: 'مؤكد',
  shipped:   'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
}
const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  shipped:   'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  delivered: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
}
const STATUS_ICONS: Record<string, string> = {
  pending: '⏳', confirmed: '✅', shipped: '🚚', delivered: '🎉', cancelled: '❌',
}

function WalletIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
      <path d="M16 3H8L6 7h12l-2-4Z" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

const EMPTY_CHECKOUT = {
  delivery_name: '',
  delivery_phone: '',
  delivery_address: '',
  notes: '',
  payment_method: 'wallet' as 'wallet' | 'code',
  access_code: '',
}

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'shop' | 'orders'>('shop')
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState('الكل')

  // Checkout state
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null)
  const [checkout, setCheckout] = useState(EMPTY_CHECKOUT)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState<{ orderId: string; total: number } | null>(null)

  // Load products + wallet balance on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/store/products').then(r => r.json()),
      fetch('/api/admin/users/wallet/balance').then(r => r.json()).catch(() => ({ balance: null })),
    ]).then(([prodData, walletData]) => {
      setProducts(prodData.products || [])
      setWalletBalance(walletData.balance ?? null)
      setLoading(false)
    })
  }, [])

  const fetchOrders = () => {
    setOrdersLoading(true)
    fetch('/api/store').then(r => r.json()).then(d => {
      setOrders(d.orders || [])
      setOrdersLoading(false)
    })
  }

  useEffect(() => { if (tab === 'orders') fetchOrders() }, [tab])

  const refreshWallet = () => {
    fetch('/api/admin/users/wallet/balance')
      .then(r => r.json())
      .then(d => setWalletBalance(d.balance ?? null))
      .catch(() => {})
  }

  const openCheckout = (product: Product) => {
    setCheckoutProduct(product)
    setCheckout(EMPTY_CHECKOUT)
    setCheckoutError(null)
    setCheckoutSuccess(null)
  }

  const handlePlaceOrder = async () => {
    if (!checkoutProduct) return
    if (!checkout.delivery_name || !checkout.delivery_phone || !checkout.delivery_address) {
      setCheckoutError('يرجى ملء كل بيانات التوصيل')
      return
    }
    if (checkout.payment_method === 'code' && !checkout.access_code.trim()) {
      setCheckoutError('يرجى إدخال كود الدفع')
      return
    }
    setCheckoutLoading(true)
    setCheckoutError(null)

    const res = await fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: checkoutProduct.id,
        quantity: 1,
        payment_method: checkout.payment_method,
        delivery_name: checkout.delivery_name,
        delivery_phone: checkout.delivery_phone,
        delivery_address: checkout.delivery_address,
        notes: checkout.notes || undefined,
        access_code: checkout.access_code || undefined,
      }),
    })
    const data = await res.json()
    setCheckoutLoading(false)

    if (!data.success) {
      setCheckoutError(data.error || 'فشل تقديم الطلب')
    } else {
      setCheckoutSuccess({ orderId: data.order_id, total: data.total })
      if (checkout.payment_method === 'wallet') refreshWallet()
    }
  }

  const categories = ['الكل', ...Array.from(new Set(products.map(p => p.category)))]
  const filtered = activeCategory === 'الكل' ? products : products.filter(p => p.category === activeCategory)

  return (
    <div className="min-h-screen bg-theme-primary" dir="rtl">

      {/* ── Page header ── */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-payback font-black text-theme-primary uppercase italic">المتجر</h1>
              <p className="text-theme-secondary text-sm mt-1">الكتب والأدوات الدراسية</p>
            </div>
            {walletBalance !== null && (
              <div className="bg-brand-gradient flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm">
                <WalletIcon className="w-4 h-4" />
                <span>رصيدك: {walletBalance} جنيه</span>
              </div>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex gap-2 mt-5 bg-[var(--bg-card-alt)] rounded-xl p-1 w-fit border border-[var(--border-color)]">
            <button
              onClick={() => setTab('shop')}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'shop' ? 'bg-brand-gradient text-white' : 'text-theme-secondary hover:text-theme-primary'}`}
            >
              تسوق
            </button>
            <button
              onClick={() => setTab('orders')}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'orders' ? 'bg-brand-gradient text-white' : 'text-theme-secondary hover:text-theme-primary'}`}
            >
              طلباتي
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ── Shop Tab ── */}
        {tab === 'shop' && (
          <>
            {/* Category filter */}
            {categories.length > 2 && (
              <div className="flex gap-2 mb-6 flex-wrap">
                {categories.map(c => (
                  <button
                    key={c}
                    onClick={() => setActiveCategory(c)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                      activeCategory === c
                        ? 'bg-brand-gradient text-white border-transparent'
                        : 'bg-theme-card border-[var(--border-color)] text-theme-secondary hover:border-primary hover:text-theme-primary'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="text-center text-theme-secondary py-20 animate-pulse text-lg">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--bg-card-alt)] flex items-center justify-center">
                  <svg className="w-10 h-10 text-theme-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                </div>
                <p className="text-theme-primary text-xl font-bold mb-2">المتجر قريبًا</p>
                <p className="text-theme-secondary">لا توجد منتجات متاحة الآن، تابعنا للجديد!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(product => (
                  <div
                    key={product.id}
                    className="bg-theme-card rounded-2xl border border-[var(--border-color)] overflow-hidden hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5 group flex flex-col"
                  >
                    {/* Product image */}
                    {product.image_url ? (
                      <div className="h-52 w-full overflow-hidden bg-[var(--bg-card-alt)]">
                        <Image src={product.image_url} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                      </div>
                    ) : (
                      <div className="h-52 w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                        <svg className="w-16 h-16 text-primary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                      </div>
                    )}

                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-theme-primary font-bold text-base leading-tight">{product.name}</h3>
                        <span className="text-primary font-black text-lg flex-shrink-0">{product.price} جنيه</span>
                      </div>

                      {product.description && (
                        <p className="text-theme-secondary text-sm mb-3 line-clamp-2 flex-1">{product.description}</p>
                      )}

                      <div className="flex items-center justify-between mb-4 mt-auto">
                        <span className="text-xs text-theme-muted bg-[var(--bg-card-alt)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
                          {product.category}
                        </span>
                        <span className={`text-xs font-bold ${product.stock > 5 ? 'text-green-500' : product.stock > 0 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {product.stock > 0 ? `متاح (${product.stock})` : 'نفذ المخزون'}
                        </span>
                      </div>

                      <button
                        onClick={() => openCheckout(product)}
                        disabled={product.stock === 0}
                        className="w-full py-3 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-brand-gradient hover:opacity-90"
                      >
                        {product.stock > 0 ? 'اطلب الآن' : 'نفذ المخزون'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Orders Tab ── */}
        {tab === 'orders' && (
          <>
            {ordersLoading ? (
              <div className="text-center text-theme-secondary py-20 animate-pulse">جاري التحميل...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--bg-card-alt)] flex items-center justify-center">
                  <svg className="w-10 h-10 text-theme-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
                </div>
                <p className="text-theme-primary text-xl font-bold mb-2">لا يوجد طلبات بعد</p>
                <p className="text-theme-secondary mb-6">تصفح المنتجات واطلب ما تحتاجه</p>
                <button
                  onClick={() => setTab('shop')}
                  className="bg-brand-gradient px-6 py-3 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
                >
                  تصفح المتجر
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="bg-theme-card rounded-2xl border border-[var(--border-color)] p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--bg-card-alt)] flex-shrink-0">
                      {(order.store_products as any)?.image_url ? (
                        <Image src={(order.store_products as any).image_url} alt={(order.store_products as any).name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-7 h-7 text-theme-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-theme-primary font-bold truncate">{(order.store_products as any)?.name || '—'}</p>
                      <p className="text-theme-secondary text-sm truncate">{order.delivery_address}</p>
                      <p className="text-theme-muted text-xs">
                        {new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-left flex-shrink-0 flex flex-col items-end gap-1.5">
                      <p className="text-primary font-bold text-sm">{order.total} جنيه</p>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[order.status]}`}>
                        {STATUS_ICONS[order.status]} {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Checkout Modal ── */}
      {checkoutProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] rounded-t-3xl sm:rounded-2xl border-t-2 sm:border-2 border-[var(--border-color)] w-full sm:max-w-lg shadow-2xl max-h-[95vh] overflow-y-auto">

            {checkoutSuccess ? (
              /* Success state */
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-theme-primary mb-2">تم الطلب بنجاح!</h3>
                <p className="text-theme-secondary mb-2">تم إرسال طلبك وسيتم التواصل معك قريبًا.</p>
                <p className="text-primary font-bold text-xl mb-6">{checkoutSuccess.total} جنيه</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setCheckoutProduct(null); setTab('orders'); fetchOrders() }}
                    className="flex-1 py-3 bg-brand-gradient text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
                  >
                    عرض طلباتي
                  </button>
                  <button
                    onClick={() => setCheckoutProduct(null)}
                    className="flex-1 py-3 bg-[var(--bg-card-alt)] text-theme-primary font-bold rounded-xl border border-[var(--border-color)] hover:bg-[var(--border-color)] transition-all"
                  >
                    متابعة التسوق
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[var(--border-color)]">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--bg-card-alt)] flex-shrink-0">
                    {checkoutProduct.image_url ? (
                      <Image src={checkoutProduct.image_url} alt={checkoutProduct.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-theme-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-theme-primary font-bold truncate">{checkoutProduct.name}</h3>
                    <p className="text-primary font-black text-2xl">{checkoutProduct.price} جنيه</p>
                  </div>
                  <button
                    onClick={() => setCheckoutProduct(null)}
                    className="text-theme-muted hover:text-theme-primary text-2xl font-light w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-card-alt)] transition-all"
                  >
                    ✕
                  </button>
                </div>

                {/* Delivery info */}
                <h4 className="text-theme-primary font-bold mb-3 text-sm uppercase tracking-wide">بيانات التوصيل</h4>
                <div className="space-y-3 mb-5">
                  {[
                    { label: 'الاسم الكامل', key: 'delivery_name', placeholder: 'اسمك كامل', required: true },
                    { label: 'رقم الهاتف', key: 'delivery_phone', placeholder: '01xxxxxxxxx', required: true },
                    { label: 'العنوان', key: 'delivery_address', placeholder: 'المحافظة، المدينة، الشارع، رقم المنزل', required: true },
                    { label: 'ملاحظات', key: 'notes', placeholder: 'أي ملاحظات إضافية (اختياري)', required: false },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-theme-secondary text-xs font-semibold mb-1">
                        {field.label}{field.required && <span className="text-primary ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        value={(checkout as any)[field.key]}
                        onChange={e => setCheckout(c => ({ ...c, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-xl text-theme-primary outline-none placeholder:text-theme-muted transition-colors text-sm"
                      />
                    </div>
                  ))}
                </div>

                {/* Payment method */}
                <h4 className="text-theme-primary font-bold mb-3 text-sm uppercase tracking-wide">طريقة الدفع</h4>
                <div className="flex rounded-xl overflow-hidden border border-[var(--border-color)] mb-4">
                  {(['wallet', 'code'] as const).map(method => (
                    <button
                      key={method}
                      onClick={() => setCheckout(c => ({ ...c, payment_method: method }))}
                      className={`flex-1 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        checkout.payment_method === method
                          ? 'bg-brand-gradient text-white'
                          : 'text-theme-secondary hover:bg-[var(--bg-card-alt)]'
                      }`}
                    >
                      {method === 'wallet' ? (
                        <>
                          <WalletIcon className="w-4 h-4" />
                          <span>المحفظة</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/></svg>
                          <span>كود الدفع</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>

                {/* Wallet balance summary */}
                {checkout.payment_method === 'wallet' && walletBalance !== null && (
                  <div className={`p-4 rounded-xl border text-sm mb-4 ${
                    walletBalance >= checkoutProduct.price
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex justify-between mb-1">
                      <span className="text-theme-secondary">رصيدك الحالي</span>
                      <span className="text-theme-primary font-bold">{walletBalance} جنيه</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-theme-secondary">سعر المنتج</span>
                      <span className="text-theme-primary font-bold">{checkoutProduct.price} جنيه</span>
                    </div>
                    <div className="border-t border-current/20 pt-2 mt-2 flex justify-between">
                      <span className="text-theme-secondary">الرصيد بعد الشراء</span>
                      <span className={`font-bold ${walletBalance >= checkoutProduct.price ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {walletBalance >= checkoutProduct.price
                          ? `${walletBalance - checkoutProduct.price} جنيه`
                          : 'رصيد غير كافٍ'}
                      </span>
                    </div>
                    {walletBalance < checkoutProduct.price && (
                      <p className="text-red-600 dark:text-red-400 text-xs font-semibold text-center mt-2">
                        تواصل مع الأستاذ لشحن محفظتك
                      </p>
                    )}
                  </div>
                )}

                {/* Code input */}
                {checkout.payment_method === 'code' && (
                  <div className="mb-4">
                    <label className="block text-theme-secondary text-xs font-semibold mb-1.5">
                      كود الدفع <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      value={checkout.access_code}
                      onChange={e => setCheckout(c => ({ ...c, access_code: e.target.value.toUpperCase() }))}
                      placeholder="XXXX-XXXX-XXXX"
                      className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-xl text-theme-primary outline-none font-mono text-center tracking-widest placeholder:text-theme-muted placeholder:tracking-normal placeholder:font-sans transition-colors"
                    />
                  </div>
                )}

                {/* Error */}
                {checkoutError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-semibold">
                    {checkoutError}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={
                    checkoutLoading ||
                    (checkout.payment_method === 'wallet' && walletBalance !== null && walletBalance < checkoutProduct.price)
                  }
                  className="w-full py-4 bg-brand-gradient text-white font-bold rounded-xl text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                >
                  {checkoutLoading ? 'جاري تقديم الطلب...' : `اطلب الآن — ${checkoutProduct.price} جنيه`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
