'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(phoneNumber: string, password: string) {
  const supabase = await createClient()

  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
  const email = `${cleanPhone}@intphy.app`

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()
  let redirectTo = '/dashboard'
  if (user) {
    const { data: profile } = await supabase
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
  grade: string,
  parentName?: string,
  parentPhoneNumber?: string
) {
  const trimmedName = (fullName ?? '').trim()
  const trimmedPhone = (phoneNumber ?? '').trim()
  const trimmedParentName = (parentName ?? '').trim()
  const trimmedParentPhone = (parentPhoneNumber ?? '').trim()

  if (!trimmedName || trimmedName.length > 100)
    return { error: 'Full name is required and must be under 100 characters.' }
  if (!trimmedPhone || trimmedPhone.length > 20)
    return { error: 'Phone number is required and must be under 20 characters.' }

  const validGrades = ['prep_1','prep_2','prep_3','sec_1','sec_2','sec_3']
  if (!grade || !validGrades.includes(grade))
    return { error: 'Please select a valid grade.' }
  if (!password || password.length < 8)
    return { error: 'Password must be at least 8 characters.' }
  if (password.length > 72)
    return { error: 'Password must be under 72 characters.' }
  if (trimmedParentName.length > 100)
    return { error: 'Parent name must be under 100 characters.' }
  if (trimmedParentPhone.length > 20)
    return { error: 'Parent phone number must be under 20 characters.' }

  const phonePattern = /^[0-9 +\-().]{7,20}$/
  if (!phonePattern.test(trimmedPhone))
    return { error: 'Please enter a valid phone number.' }
  if (trimmedParentPhone && !phonePattern.test(trimmedParentPhone))
    return { error: 'Please enter a valid parent phone number.' }

  const supabase = await createClient()

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
        grade,
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
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    await supabase.auth.refreshSession()
  }
  revalidatePath('/', 'layout')
  return { success: true }
}
