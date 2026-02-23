'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  full_name: string
  phone_number: string
  role: string
  created_at: string
  is_banned: boolean
}

const roleColor: Record<string, string> = {
  admin: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  teacher: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  student: 'bg-[#6A0DAD]/20 text-purple-400 border border-purple-500/30',
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null) // userId being actioned

  // Password modal
  const [passwordModal, setPasswordModal] = useState<{ userId: string; name: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Delete confirm modal
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
    return (
      u.phone_number?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q)
    )
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
      showToast('success', ban ? `${name} has been banned.` : `${name} has been unbanned.`)
      fetchUsers()
    } else {
      showToast('error', data.error || 'Action failed')
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
      showToast('success', `${deleteModal.name}'s account has been deleted.`)
      fetchUsers()
    } else {
      showToast('error', data.error || 'Delete failed')
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
      setPasswordMsg({ type: 'success', text: `Password updated! New password: ${newPassword}` })
      setNewPassword('')
    } else {
      setPasswordMsg({ type: 'error', text: data.error || 'Failed to update password' })
    }
  }

  return (
    <div className="p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-2xl border transition-all ${
          toast.type === 'success'
            ? 'bg-green-900/90 border-green-500/50 text-green-300'
            : 'bg-red-900/90 border-red-500/50 text-red-300'
        }`}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.text}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-4xl font-black text-[#EFEFEF] uppercase italic font-payback mb-2">User Management</h1>
        <p className="text-[#B3B3B3]">All users across all roles</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#2A2A2A] rounded-lg p-4 border-l-4 border-[#6A0DAD]">
          <p className="text-[#B3B3B3] text-sm">Students</p>
          <p className="text-3xl font-bold text-[#EFEFEF]">{roleCounts.student}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-4 border-l-4 border-blue-500">
          <p className="text-[#B3B3B3] text-sm">Teachers</p>
          <p className="text-3xl font-bold text-[#EFEFEF]">{roleCounts.teacher}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-4 border-l-4 border-yellow-500">
          <p className="text-[#B3B3B3] text-sm">Admins</p>
          <p className="text-3xl font-bold text-[#EFEFEF]">{roleCounts.admin}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B3B3B3]">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or phone number..."
          className="w-full pl-10 pr-4 py-3 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-xl text-[#EFEFEF] outline-none placeholder:text-gray-600 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#EFEFEF]">✕</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#2A2A2A] rounded-xl overflow-hidden border border-[#3A3A3A]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#6A0DAD]">
              <tr>
                <th className="px-6 py-3 text-left text-white font-bold text-sm">Name</th>
                <th className="px-6 py-3 text-left text-white font-bold text-sm">Phone</th>
                <th className="px-6 py-3 text-left text-white font-bold text-sm">Role</th>
                <th className="px-6 py-3 text-left text-white font-bold text-sm">Status</th>
                <th className="px-6 py-3 text-left text-white font-bold text-sm">Joined</th>
                <th className="px-6 py-3 text-left text-white font-bold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A3A3A]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#B3B3B3] animate-pulse">Loading users...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#B3B3B3]">
                    {search ? `No users found matching "${search}"` : 'No users found'}
                  </td>
                </tr>
              ) : filtered.map((user) => (
                <tr key={user.id} className={`hover:bg-[#3A3A3A] transition-colors ${user.is_banned ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#6A0DAD]/40 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {user.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[#EFEFEF] font-semibold">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#B3B3B3] font-mono text-sm">{user.phone_number}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${roleColor[user.role] || 'bg-gray-500/20 text-gray-400'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.is_banned ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                      {user.is_banned ? 'BANNED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#B3B3B3] text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Ban / Unban */}
                      <button
                        onClick={() => handleBan(user.id, !user.is_banned, user.full_name)}
                        disabled={actionLoading === user.id + '-ban'}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-50 ${
                          user.is_banned
                            ? 'bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/30'
                            : 'bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-600/30'
                        }`}
                      >
                        {actionLoading === user.id + '-ban' ? '...' : user.is_banned ? '✓ Unban' : '⊘ Ban'}
                      </button>

                      {/* Reset Password */}
                      <button
                        onClick={() => { setPasswordModal({ userId: user.id, name: user.full_name }); setNewPassword(''); setPasswordMsg(null) }}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/30 transition-all"
                      >
                        🔑 Password
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteModal({ userId: user.id, name: user.full_name })}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 transition-all"
                      >
                        🗑 Delete
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
        <p className="text-[#B3B3B3] text-sm mt-3">
          Showing {filtered.length} of {users.length} users
        </p>
      )}

      {/* ── Password Modal ── */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1e2125] rounded-2xl border-2 border-[#3A3A3A] w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-[#EFEFEF] mb-1">🔑 Reset Password</h2>
            <p className="text-[#B3B3B3] text-sm mb-5">
              Set a new password for <span className="text-[#EFEFEF] font-semibold">{passwordModal.name}</span>
            </p>

            <div className="relative mb-4">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="New password (min 8 characters)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasswordReset()}
                className="w-full px-4 py-3 pr-12 bg-[#2A2A2A] border-2 border-[#3A3A3A] focus:border-[#6A0DAD] rounded-xl text-[#EFEFEF] outline-none placeholder:text-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#EFEFEF]"
              >
                <i className={`fi ${showNewPassword ? 'fi-rr-eye-crossed' : 'fi-rr-eye'} text-lg`} />
              </button>
            </div>

            {passwordMsg && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold border ${
                passwordMsg.type === 'success'
                  ? 'bg-green-900/30 border-green-500/40 text-green-300'
                  : 'bg-red-900/30 border-red-500/40 text-red-300'
              }`}>
                {passwordMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handlePasswordReset}
                disabled={!newPassword.trim() || newPassword.length < 8 || actionLoading === passwordModal.userId + '-pw'}
                className="flex-1 py-3 bg-[#6A0DAD] hover:bg-[#8B2CAD] text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading === passwordModal.userId + '-pw' ? 'Saving...' : 'Set Password'}
              </button>
              <button
                onClick={() => { setPasswordModal(null); setPasswordMsg(null); setNewPassword('') }}
                className="flex-1 py-3 bg-[#3A3A3A] hover:bg-[#4A4A4A] text-[#EFEFEF] font-bold rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1e2125] rounded-2xl border-2 border-red-800/50 w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-red-400 mb-2">🗑 Delete Account</h2>
            <p className="text-[#B3B3B3] text-sm mb-2">
              Are you sure you want to permanently delete the account of:
            </p>
            <p className="text-[#EFEFEF] font-bold text-lg mb-5">{deleteModal.name}</p>
            <p className="text-red-400 text-xs mb-6 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3">
              ⚠️ This action is irreversible. All their data, enrollments, and progress will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={actionLoading === deleteModal.userId + '-delete'}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {actionLoading === deleteModal.userId + '-delete' ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-3 bg-[#3A3A3A] hover:bg-[#4A4A4A] text-[#EFEFEF] font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
