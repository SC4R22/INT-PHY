'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(
  fullName: string,
  phoneNumber: string,
  password: string,
  parentName?: string,
  parentPhoneNumber?: string
) {
  const supabase = await createClient()

  // Convert phone to email format
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
  const email = `${cleanPhone}@intphy.app`

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        parent_name: parentName || null,
        phone_number: phoneNumber,
        parent_phone_number: parentPhoneNumber || null,
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
