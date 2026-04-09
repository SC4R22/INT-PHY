'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category: string
  stock: number
  is_available: boolean
  created_at: string
}

interface Order {
  id: string
  quantity: number
  unit_price: number
  total: number
  payment_method: string
  status: string
  delivery_name: string
  delivery_phone: string
  delivery_address: string
  notes: string | null
  created_at: string
  user_profiles: { id: string; full_name: string; phone_number: string } | null
  store_products: { id: string; name: string; image_url: string | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'قيد الانتظار',
  confirmed: 'مؤكد',
  shipped:   'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
}
const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  shipped:   'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
  delivered: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
}

const EMPTY_FORM = { name: '', description: '', price: '', image_url: '', category: 'general', stock: '', is_available: true }

export default function AdminStorePage() {
  const [tab, setTab] = useState<'products' | 'orders'>('products')

  // ── Products ────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([])
  const [prodLoading, setProdLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // ── Orders ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [orderFilter, setOrderFilter] = useState('')
  const [statusLoading, setStatusLoading] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  // ── Toast ────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Fetchers ─────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setProdLoading(true)
    const res = await fetch('/api/admin/store/products')
    const data = await res.json()
    setProducts(data.products || [])
    setProdLoading(false)
  }, [])

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true)
    const url = orderFilter ? `/api/admin/store/orders?status=${orderFilter}` : '/api/admin/store/orders'
    const res = await fetch(url)
    const data = await res.json()
    setOrders(data.orders || [])
    setOrdersLoading(false)
  }, [orderFilter])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { if (tab === 'orders') fetchOrders() }, [tab, fetchOrders])

  // ── Product form ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormMsg(null)
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditingId(p.id)
    setForm({ name: p.name, description: p.description || '', price: String(p.price), image_url: p.image_url || '', category: p.category, stock: String(p.stock), is_available: p.is_available })
    setFormMsg(null)
    setShowForm(true)
  }

  const handleFormSubmit = async () => {
    if (!form.name || !form.price || !form.stock) { setFormMsg({ type: 'error', text: 'الاسم والسعر والمخزون مطلوبة' }); return }
    setFormLoading(true); setFormMsg(null)
    const payload = { ...form, price: Number(form.price), stock: Number(form.stock) }
    const res = await fetch(editingId ? `/api/admin/store/products/${editingId}` : '/api/admin/store/products', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setFormLoading(false)
    if (data.error) { setFormMsg({ type: 'error', text: data.error }); return }
    showToast('success', editingId ? 'تم تحديث المنتج' : 'تم إضافة المنتج')
    setShowForm(false)
    fetchProducts()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/store/products/${id}`, { method: 'DELETE' })
    const data = await res.json()
    setDeleteId(null)
    if (data.success) { showToast('success', 'تم حذف المنتج'); fetchProducts() }
    else showToast('error', data.error || 'فشل الحذف')
  }

  const handleToggleAvailable = async (p: Product) => {
    const res = await fetch(`/api/admin/store/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !p.is_available }),
    })
    const data = await res.json()
    if (!data.error) fetchProducts()
  }

  // ── Order status update ───────────────────────────────────────────────────────
  const handleStatusChange = async (orderId: string, status: string) => {
    setStatusLoading(orderId)
    const res = await fetch(`/api/admin/store/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    setStatusLoading(null)
    if (!data.error) { showToast('success', 'تم تحديث الحالة'); fetchOrders() }
    else showToast('error', data.error)
  }

  return (
    <div className="p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-2xl border transition-all ${
          toast.type === 'success'
            ? 'bg-green-100 dark:bg-green-900/90 border-green-400 text-green-800 dark:text-green-300'
            : 'bg-red-100 dark:bg-red-900/90 border-red-400 text-red-800 dark:text-red-300'
        }`}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.text}
        </div>
      )}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-black text-theme-primary uppercase italic font-payback mb-1">🛍️ إدارة المتجر</h1>
        <p className="text-theme-secondary">إدارة المنتجات والطلبات</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 bg-theme-card rounded-xl p-1 border border-[var(--border-color)] w-fit">
        {(['products', 'orders'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === t ? 'text-white' : 'text-theme-secondary hover:text-theme-primary'}`}
            style={tab === t ? { background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' } : {}}>
            {t === 'products' ? `📦 المنتجات (${products.length})` : `📋 الطلبات (${orders.length})`}
          </button>
        ))}
      </div>

      {/* ── Products Tab ── */}
      {tab === 'products' && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <p className="text-theme-secondary text-sm">{products.length} منتج</p>
            <button onClick={openAdd}
              className="px-5 py-2.5 text-white font-bold rounded-xl text-sm transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' }}>
              ＋ منتج جديد
            </button>
          </div>

          {prodLoading ? (
            <div className="text-center text-theme-secondary py-16 animate-pulse">جاري التحميل...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)]">
              <p className="text-5xl mb-3">🛍️</p>
              <p className="text-theme-primary font-bold text-lg mb-1">لا يوجد منتجات</p>
              <p className="text-theme-secondary text-sm mb-4">ابدأ بإضافة أول منتج للمتجر</p>
              <button onClick={openAdd}
                className="px-6 py-3 text-white font-bold rounded-xl"
                style={{ background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' }}>
                ＋ أضف منتج
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map(p => (
                <div key={p.id} className={`bg-theme-card rounded-2xl border overflow-hidden transition-all ${p.is_available ? 'border-[var(--border-color)]' : 'border-[var(--border-color)] opacity-60'}`}>
                  {/* Image */}
                  {p.image_url ? (
                    <div className="h-44 w-full overflow-hidden relative bg-[var(--bg-card-alt)]">
                      <Image src={p.image_url} alt={p.name} fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="h-44 w-full bg-[var(--bg-card-alt)] flex items-center justify-center">
                      <span className="text-5xl opacity-30">🛍️</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="text-theme-primary font-bold text-base truncate">{p.name}</h3>
                        <span className="text-xs text-theme-muted bg-[var(--bg-card-alt)] px-2 py-0.5 rounded-full">{p.category}</span>
                      </div>
                      <span className="text-primary font-black text-lg flex-shrink-0">{p.price} جنيه</span>
                    </div>
                    {p.description && (
                      <p className="text-theme-secondary text-xs mb-3 line-clamp-2">{p.description}</p>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${p.stock > 0 ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'}`}>
                        مخزون: {p.stock}
                      </span>
                      <button
                        onClick={() => handleToggleAvailable(p)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-all ${p.is_available ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-red-500/10' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-green-500/10'}`}
                      >
                        {p.is_available ? '✓ متاح' : '✕ مخفي'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)}
                        className="flex-1 py-2 text-xs font-bold rounded-lg bg-[var(--bg-card-alt)] hover:bg-[var(--border-color)] text-theme-primary border border-[var(--border-color)] transition-all">
                        ✏️ تعديل
                      </button>
                      <button onClick={() => setDeleteId(p.id)}
                        className="flex-1 py-2 text-xs font-bold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 transition-all">
                        🗑 حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Orders Tab ── */}
      {tab === 'orders' && (
        <div>
          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <p className="text-theme-secondary text-sm">{orders.length} طلب</p>
            <div className="flex gap-2 flex-wrap">
              {['', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
                <button key={s} onClick={() => setOrderFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${orderFilter === s ? 'text-white border-transparent' : 'bg-theme-card border-[var(--border-color)] text-theme-secondary hover:border-primary hover:text-theme-primary'}`}
                  style={orderFilter === s ? { background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' } : {}}>
                  {s ? STATUS_LABELS[s] : 'الكل'}
                </button>
              ))}
            </div>
          </div>

          {ordersLoading ? (
            <div className="text-center text-theme-secondary py-16 animate-pulse">جاري التحميل...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 bg-theme-card rounded-2xl border-2 border-dashed border-[var(--border-color)]">
              <p className="text-5xl mb-3">📋</p>
              <p className="text-theme-primary font-bold text-lg">لا يوجد طلبات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="bg-theme-card rounded-2xl border border-[var(--border-color)] overflow-hidden">
                  {/* Order summary row */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[var(--bg-card-alt)] transition-colors"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    {/* Product image */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--bg-card-alt)] flex-shrink-0">
                      {order.store_products?.image_url
                        ? <Image src={order.store_products.image_url} alt={order.store_products.name} fill className="object-cover" unoptimized />
                        : <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-theme-primary font-bold text-sm truncate">{order.store_products?.name || '—'}</span>
                        <span className="text-theme-muted text-xs">×{order.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-theme-secondary text-xs">{order.user_profiles?.full_name || '—'}</span>
                        <span className="text-theme-muted text-xs">{order.user_profiles?.phone_number}</span>
                        <span className="text-xs text-theme-muted">{new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-primary font-bold text-sm">{order.total} جنيه</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                      <span className="text-theme-muted text-xs">{expandedOrder === order.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedOrder === order.id && (
                    <div className="border-t border-[var(--border-color)] p-4 bg-[var(--bg-card-alt)]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-theme-muted text-xs font-bold uppercase mb-2">بيانات التوصيل</p>
                          <p className="text-theme-primary font-semibold">{order.delivery_name}</p>
                          <p className="text-theme-secondary">{order.delivery_phone}</p>
                          <p className="text-theme-secondary">{order.delivery_address}</p>
                          {order.notes && <p className="text-theme-muted text-xs mt-1 italic">{order.notes}</p>}
                        </div>
                        <div>
                          <p className="text-theme-muted text-xs font-bold uppercase mb-2">بيانات الطلب</p>
                          <p className="text-theme-secondary">طريقة الدفع: <span className="text-theme-primary font-semibold">{order.payment_method === 'wallet' ? '👛 محفظة' : '🎟️ كود'}</span></p>
                          <p className="text-theme-secondary">السعر للوحدة: <span className="text-theme-primary font-semibold">{order.unit_price} جنيه</span></p>
                          <p className="text-theme-secondary">الإجمالي: <span className="text-primary font-bold">{order.total} جنيه</span></p>
                        </div>
                      </div>
                      {/* Status change */}
                      <div>
                        <p className="text-theme-muted text-xs font-bold uppercase mb-2">تغيير الحالة</p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(STATUS_LABELS).map(([key, label]) => (
                            <button
                              key={key}
                              onClick={() => handleStatusChange(order.id, key)}
                              disabled={statusLoading === order.id || order.status === key}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${order.status === key ? STATUS_COLORS[key] : 'bg-theme-card border-[var(--border-color)] text-theme-secondary hover:border-primary hover:text-theme-primary'}`}
                            >
                              {statusLoading === order.id ? '...' : label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Product Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] rounded-2xl border-2 border-[var(--border-color)] w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-theme-primary mb-5">
              {editingId ? '✏️ تعديل المنتج' : '➕ منتج جديد'}
            </h2>

            <div className="space-y-4">
              {[
                { label: 'اسم المنتج *', key: 'name', type: 'text', placeholder: 'مثال: كتاب النحو والصرف' },
                { label: 'السعر (جنيه) *', key: 'price', type: 'number', placeholder: '0' },
                { label: 'المخزون *', key: 'stock', type: 'number', placeholder: '0' },
                { label: 'الفئة', key: 'category', type: 'text', placeholder: 'مثال: كتب / أدوات مدرسية' },
                { label: 'رابط الصورة', key: 'image_url', type: 'text', placeholder: 'https://...' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-theme-secondary text-xs font-bold mb-1.5 uppercase">{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as any)[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-xl text-theme-primary outline-none placeholder:text-theme-muted transition-colors"
                  />
                </div>
              ))}

              <div>
                <label className="block text-theme-secondary text-xs font-bold mb-1.5 uppercase">الوصف</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="وصف المنتج..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-xl text-theme-primary outline-none placeholder:text-theme-muted transition-colors resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
                  className={`w-12 h-6 rounded-full transition-all relative ${form.is_available ? 'bg-green-500' : 'bg-[var(--border-color)]'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_available ? 'left-6' : 'left-0.5'}`} />
                </button>
                <span className="text-theme-secondary text-sm font-semibold">متاح للبيع</span>
              </div>
            </div>

            {formMsg && (
              <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-semibold border ${
                formMsg.type === 'success'
                  ? 'bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-300'
                  : 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300'
              }`}>
                {formMsg.text}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleFormSubmit}
                disabled={formLoading}
                className="flex-1 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(90deg,#FD1D1D,#FCB045)' }}
              >
                {formLoading ? 'جاري الحفظ...' : editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 bg-[var(--bg-card-alt)] hover:bg-[var(--border-color)] text-theme-primary font-bold rounded-xl border border-[var(--border-color)] transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] rounded-2xl border-2 border-red-500/40 w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-3">🗑 حذف المنتج</h2>
            <p className="text-theme-secondary text-sm mb-6">هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl">حذف</button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-3 bg-[var(--bg-card-alt)] text-theme-primary font-bold rounded-xl border border-[var(--border-color)]">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
