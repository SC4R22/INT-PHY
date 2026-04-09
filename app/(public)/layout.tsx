import { StudentNav } from '@/components/student-nav'
import { Footer } from '@/components/footer'

export default async function PublicGroupLayout({ children }: { children: React.ReactNode }) {
  let isLoggedIn = false
  let userName: string | null = null
  let userRole: string | null = null
  let walletBalance: number | null = null

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    isLoggedIn = !!user
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()
      userName = profile?.full_name ?? null
      userRole = profile?.role ?? null

      if (profile?.role === 'student') {
        const { data: wallet } = await supabase
          .from('wallet_balances')
          .select('balance')
          .eq('user_id', user.id)
          .single()
        walletBalance = wallet ? Number(wallet.balance) : 0
      }
    }
  } catch {
    // If auth fails, render as logged-out — never crash the layout
  }

  return (
    <div className="flex flex-col min-h-screen">
      {isLoggedIn && userName && userRole && (
        <StudentNav
          userName={userName}
          userRole={userRole}
          walletBalance={walletBalance}
        />
      )}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
