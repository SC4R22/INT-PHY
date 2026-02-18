'use client'

import { refreshSession } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RefreshSessionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await refreshSession()
      setSuccess(true)
      // Wait a bit then redirect
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1000)
    } catch (error) {
      console.error('Error refreshing session:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-[#2A2A2A] rounded-xl p-8 shadow-xl">
        <h1 className="text-4xl font-bold text-white mb-4">Refresh Your Session</h1>
        <p className="text-gray-400 mb-8">
          If you just changed your role to admin in the database, click the button below to refresh your session and apply the changes.
        </p>

        <div className="bg-[#3A3A3A] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-3">What this does:</h2>
          <ul className="text-gray-300 space-y-2">
            <li>✓ Refreshes your authentication session</li>
            <li>✓ Clears all cached data</li>
            <li>✓ Reloads your profile from the database</li>
            <li>✓ Applies your new admin role</li>
          </ul>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading || success}
          className="w-full px-6 py-4 bg-[#6A0DAD] text-white rounded-lg font-bold hover:bg-[#8B2CAD] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {loading ? 'Refreshing...' : success ? '✓ Success! Redirecting...' : 'Refresh Session Now'}
        </button>

        {success && (
          <p className="text-green-400 mt-4 text-center font-semibold">
            Session refreshed! Redirecting to dashboard...
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-gray-400 text-sm mb-3">Alternative options:</p>
          <div className="space-y-2">
            <a
              href="/debug"
              className="block w-full px-4 py-2 bg-gray-700 text-white rounded-lg text-center hover:bg-gray-600 transition-all"
            >
              View Debug Info
            </a>
            <a
              href="/dashboard"
              className="block w-full px-4 py-2 bg-gray-700 text-white rounded-lg text-center hover:bg-gray-600 transition-all"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
