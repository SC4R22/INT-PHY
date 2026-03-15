'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  full_name: string
  phone_number: string
  role: string
  created_at: string
  is_banned: boolean
}

const roleColor: Record<string, string> = {
  admin: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30',
  teacher: 'bg-primary/20 text-primary border border-primary/30',
  student: 'bg-primary/20 text-primary border border-primary/30',
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [passwordModal, setPasswordModal] = useState<{ userId: string; name: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [deleteModal, setDeleteModal] = useState<{ userId: string; name: string } | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return u.phone_number?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q)
  })

  const roleCounts = {
    student: users.filter(u => u.role === 'student').length,
    teacher: users.filter(u => u.role === 'teacher').length,
    admin: users.filter(u => u.role === 'admin').length,
  }

  const handleBan = async (userId: string, ban: boolean, name: string) => {
    setActionLoading(userId + '-ban')
    const res = await fetch('/api/admin/users/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ban }),
    })
    const data = await res.json()
    setActionLoading(null)
    if (data.success) {
      showToast('success', ban ? `تم حظر ${name}.` : `تم رفع الحظر عن ${name}.`)
      fetchUsers()
    } else {
      showToast('error', data.error || 'فشل الإجراء')
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    setActionLoading(deleteModal.userId + '-delete')
    const res = await fetch('/api/admin/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: deleteModal.userId }),
    })
    const data = await res.json()
    setActionLoading(null)
    setDeleteModal(null)
    if (data.success) {
      showToast('success', `تم حذف حساب ${deleteModal.name}.`)
      fetchUsers()
    } else {
      showToast('error', data.error || 'فشل الحذف')
    }
  }

  const handlePasswordReset = async () => {
    if (!passwordModal || !newPassword.trim()) return
    setPasswordMsg(null)
    setActionLoading(passwordModal.userId + '-pw')
    const res = await fetch('/api/admin/users/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: passwordModal.userId, newPassword }),
    })
    const data = await res.json()
    setActionLoading(null)
    if (data.success) {
      setPasswordMsg({ type: 'success', text: `تم تحديث كلمة السر! كلمة السر الجديدة: ${newPassword}` })
      setNewPassword('')
    } else {
      setPasswordMsg({ type: 'error', text: data.error || 'فشل تحديث كلمة السر' })
    }
  }

  return (
    <div className="p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-2xl border transition-all ${
          toast.type === 'success'
            ? 'bg-green-100 dark:bg-green-900/90 border-green-400 dark:border-green-500/50 text-green-800 dark:text-green-300'
            : 'bg-red-100 dark:bg-red-900/90 border-red-400 dark:border-red-500/50 text-red-800 dark:text-red-300'
        }`}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.text}
        </div>
      )}

      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-theme-primary uppercase italic font-payback mb-2">إدارة المستخدمين</h1>
        <p className="text-theme-secondary">كل المستخدمين بكل الأدوار — اضغط على أي مستخدم لعرض تفاصيله</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="bg-theme-card rounded-lg p-4 border-l-4 border-primary">
          <p className="text-theme-secondary text-sm">طلاب</p>
          <p className="text-3xl font-bold text-theme-primary">{roleCounts.student}</p>
        </div>
        <div className="bg-theme-card rounded-lg p-4 border-l-4 border-primary">
          <p className="text-theme-secondary text-sm">مدرسين</p>
          <p className="text-3xl font-bold text-theme-primary">{roleCounts.teacher}</p>
        </div>
        <div className="bg-theme-card rounded-lg p-4 border-l-4 border-yellow-500">
          <p className="text-theme-secondary text-sm">أدمنز</p>
          <p className="text-3xl font-bold text-theme-primary">{roleCounts.admin}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-secondary">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          className="w-full pl-10 pr-4 py-3 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-xl text-theme-primary outline-none placeholder:text-theme-muted transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary">✕</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-theme-card rounded-xl overflow-hidden border border-[var(--border-color)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}>
              <tr>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">الاسم</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">الهاتف</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">الدور</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">الحالة</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">تاريخ الانضمام</th>
                <th className="px-6 py-3 text-right text-white font-bold text-sm">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-theme-secondary animate-pulse">جاري التحميل...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-theme-secondary">
                    {search ? `لا يوجد مستخدمين بحثًا عن "${search}"` : 'لا يوجد مستخدمين'}
                  </td>
                </tr>
              ) : filtered.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  className={`hover:bg-[var(--bg-card-alt)] transition-colors cursor-pointer ${user.is_banned ? 'opacity-60' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {user.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-theme-primary font-semibold">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-theme-secondary font-mono text-sm">{user.phone_number}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${roleColor[user.role] || 'bg-gray-500/20 text-gray-500'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.is_banned ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30'}`}>
                      {user.is_banned ? 'محظور' : 'نشيط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-theme-secondary text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleBan(user.id, !user.is_banned, user.full_name)}
                        disabled={actionLoading === user.id + '-ban'}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-50 ${
                          user.is_banned
                            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-700 dark:text-green-400 border border-green-500/30'
                            : 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-700 dark:text-orange-400 border border-orange-500/30'
                        }`}
                      >
                        {actionLoading === user.id + '-ban' ? '...' : user.is_banned ? '✓ رفع الحظر' : '⛘ حظر'}
                      </button>
                      <button
                        onClick={() => { setPasswordModal({ userId: user.id, name: user.full_name }); setNewPassword(''); setPasswordMsg(null) }}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-white border-0" style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}
                      >
                        🔑 كلمة السر
                      </button>
                      <button
                        onClick={() => setDeleteModal({ userId: user.id, name: user.full_name })}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-400 border border-red-500/30 transition-all"
                      >
                        🗑 حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {search && (
        <p className="text-theme-secondary text-sm mt-3">
          يظهر {filtered.length} من {users.length} مستخدم
        </p>
      )}

      {/* Password Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] rounded-2xl border-2 border-[var(--border-color)] w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-theme-primary mb-1">🔑 إعادة تعيين كلمة السر</h2>
            <p className="text-theme-secondary text-sm mb-5">
              تعيين كلمة سر جديدة لـ <span className="text-theme-primary font-semibold">{passwordModal.name}</span>
            </p>
            <div className="relative mb-4">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="كلمة سر جديدة (آدناها 8 حروف)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasswordReset()}
                className="w-full px-4 py-3 pr-12 bg-[var(--bg-input)] border-2 border-[var(--border-color)] focus:border-primary rounded-xl text-theme-primary outline-none placeholder:text-theme-muted"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary"
              >
                {showNewPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {passwordMsg && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold border ${
                passwordMsg.type === 'success'
                  ? 'bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-300'
                  : 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300'
              }`}>
                {passwordMsg.text}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handlePasswordReset}
                disabled={!newPassword.trim() || newPassword.length < 8 || actionLoading === passwordModal.userId + '-pw'}
                className="flex-1 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(90deg, #FD1D1D 0%, #FCB045 100%)' }}
              >
                {actionLoading === passwordModal.userId + '-pw' ? 'جاري الحفظ...' : 'تعيين كلمة السر'}
              </button>
              <button
                onClick={() => { setPasswordModal(null); setPasswordMsg(null); setNewPassword('') }}
                className="flex-1 py-3 bg-[var(--bg-card-alt)] hover:bg-[var(--border-color)] text-theme-primary font-bold rounded-xl transition-all border border-[var(--border-color)]"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] rounded-2xl border-2 border-red-500/40 w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">🗑 حذف الحساب</h2>
            <p className="text-theme-secondary text-sm mb-2">
              هل أنت متأكد من حذف حساب:
            </p>
            <p className="text-theme-primary font-bold text-lg mb-5">{deleteModal.name}</p>
            <p className="text-red-600 dark:text-red-400 text-xs mb-6 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              ⚠️ هذا الإجراء لا يمكن التراجع عنه. سيتم حذف كل بياناته واشتراكاته وتقدمه نهائيًا.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={actionLoading === deleteModal.userId + '-delete'}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {actionLoading === deleteModal.userId + '-delete' ? 'جاري الحذف...' : 'نعم، احذف'}
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-3 bg-[var(--bg-card-alt)] hover:bg-[var(--border-color)] text-theme-primary font-bold rounded-xl transition-all border border-[var(--border-color)]"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
