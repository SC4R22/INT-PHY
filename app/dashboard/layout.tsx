import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  // Use RLS-scoped server client — user can only read their own profile row
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_banned')
    .eq('id', user.id)
    .single()

  if (profile?.is_banned) {
    await supabase.auth.signOut()
    redirect('/login?banned=1')
  }

  return <>{children}</>
}
