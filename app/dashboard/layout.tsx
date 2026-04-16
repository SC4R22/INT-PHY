import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentNav } from '@/components/student-nav'
import { DeviceGuardClient } from '@/components/DeviceGuardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, is_banned')
    .eq('id', user.id)
    .single()

  if (profile?.is_banned) {
    await supabase.auth.signOut()
    redirect('/login?banned=1')
  }

  if (!profile) {
    redirect('/login')
  }

  let walletBalance: number | null = null
  if (profile.role === 'student') {
    const { data: wallet } = await supabase
      .from('wallet_balances')
      .select('balance')
      .eq('user_id', user.id)
      .single()
    walletBalance = wallet ? Number(wallet.balance) : 0
  }

  return (
    <>
      {/* Device limit enforcement — runs silently on client, kicks 3rd devices */}
      <DeviceGuardClient userRole={profile.role} />
      <StudentNav
        userName={profile.full_name}
        userRole={profile.role}
        walletBalance={walletBalance}
      />
      {children}
    </>
  )
}
