'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function login(phoneNumber: string, password: string) {
  const supabase = await createClient()

  // Convert phone to email format
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
  const email = `${cleanPhone}@intphy.app`

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Check role to redirect admins/teachers to admin panel
  const { data: { user } } = await supabase.auth.getUser()
  let redirectTo = '/dashboard'
  if (user) {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'admin' || profile?.role === 'teacher') {
      redirectTo = '/admin'
    }
  }

  revalidatePath('/', 'layout')
  redirect(redirectTo)
}

export async function signup(
  fullName: string,
  phoneNumber: string,
  password: string,
  parentName?: string,
  parentPhoneNumber?: string
) {
  // ── Server-side input validation ─────────────────────────────────────────
  const trimmedName = (fullName ?? '').trim()
  const trimmedPhone = (phoneNumber ?? '').trim()
  const trimmedParentName = (parentName ?? '').trim()
  const trimmedParentPhone = (parentPhoneNumber ?? '').trim()

  if (!trimmedName || trimmedName.length > 100) {
    return { error: 'Full name is required and must be under 100 characters.' }
  }
  if (!trimmedPhone || trimmedPhone.length > 20) {
    return { error: 'Phone number is required and must be under 20 characters.' }
  }
  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (password.length > 72) {
    return { error: 'Password must be under 72 characters.' }
  }
  if (trimmedParentName.length > 100) {
    return { error: 'Parent name must be under 100 characters.' }
  }
  if (trimmedParentPhone.length > 20) {
    return { error: 'Parent phone number must be under 20 characters.' }
  }
  // Only allow digits, spaces, +, -, (, ) in phone fields
  const phonePattern = /^[0-9 +\-().]{7,20}$/
  if (!phonePattern.test(trimmedPhone)) {
    return { error: 'Please enter a valid phone number.' }
  }
  if (trimmedParentPhone && !phonePattern.test(trimmedParentPhone)) {
    return { error: 'Please enter a valid parent phone number.' }
  }

  const supabase = await createClient()

  // Convert phone to email format
  const cleanPhone = trimmedPhone.replace(/[^0-9]/g, '')
  const email = `${cleanPhone}@intphy.app`

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: trimmedName,
        parent_name: trimmedParentName || null,
        phone_number: trimmedPhone,
        parent_phone_number: trimmedParentPhone || null,
        role: 'student',
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function refreshSession() {
  const supabase = await createClient()
  
  // Force refresh the session
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session) {
    // Refresh the access token
    await supabase.auth.refreshSession()
  }
  
  // Revalidate all paths to clear any cached data
  revalidatePath('/', 'layout')
  
  return { success: true }
}
