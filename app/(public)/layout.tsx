import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export default async function PublicGroupLayout({ children }: { children: React.ReactNode }) {
  let isLoggedIn = false
  let userName: string | null = null
  let userRole: string | null = null

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    isLoggedIn = !!user
    if (user) {
      const { data } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()
      userName = data?.full_name ?? null
      userRole = data?.role ?? null
    }
  } catch {
    // If auth fails for any reason, render as logged-out — never crash the layout
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header isLoggedIn={isLoggedIn} userName={userName} userRole={userRole} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
