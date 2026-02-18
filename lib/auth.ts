import { createClient } from './supabase/client'

export interface SignUpData {
  fullName: string
  parentName?: string
  phoneNumber: string
  parentPhoneNumber?: string
  password: string
}

export interface LoginData {
  phoneNumber: string
  password: string
}

/**
 * Convert phone number to email format for Supabase Auth
 * Since Supabase requires email, we create a deterministic email from phone
 * Using .app domain which is valid for internal use
 */
export function phoneToEmail(phoneNumber: string): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')
  return `${cleanPhone}@intphy.app`
}

/**
 * Check if a phone number is available (not already registered)
 */
export async function isPhoneAvailable(phoneNumber: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .rpc('is_phone_number_available', { p_phone_number: phoneNumber })
    
    if (error) throw error
    return data as boolean
  } catch (error) {
    console.error('Error checking phone availability:', error)
    return false
  }
}

/**
 * Sign up a new user with phone-based authentication
 */
export async function signUp(data: SignUpData) {
  const supabase = createClient()

  try {
    // Check if phone number is already in use
    const available = await isPhoneAvailable(data.phoneNumber)
    if (!available) {
      return {
        error: { message: 'This phone number is already registered' }
      }
    }

    // Create email from phone number
    const email = phoneToEmail(data.phoneNumber)

    // Sign up the user with email confirmation disabled
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        emailRedirectTo: undefined,
        data: {
          full_name: data.fullName,
          parent_name: data.parentName || null,
          phone_number: data.phoneNumber,
          parent_phone_number: data.parentPhoneNumber || null,
          role: 'student'
        }
      }
    })

    if (error) {
      // Make error message more user-friendly
      let errorMessage = error.message
      if (errorMessage.includes('Email') || errorMessage.includes('email')) {
        errorMessage = 'Unable to create account. Please try a different phone number.'
      }
      return { error: { message: errorMessage } }
    }

    return { data: authData }
  } catch (error: any) {
    console.error('Signup error:', error)
    return { error: { message: 'Failed to create account. Please try again.' } }
  }
}

/**
 * Sign in a user with phone number and password
 */
export async function signIn(data: LoginData) {
  const supabase = createClient()

  try {
    const email = phoneToEmail(data.phoneNumber)

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: data.password
    })

    if (error) return { error }

    return { data: authData }
  } catch (error: any) {
    return { error: { message: error.message || 'Login failed' } }
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Get the current user's session
 */
export async function getSession() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getSession()
  return { data, error }
}

/**
 * Get the current user
 */
export async function getUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  return { data, error }
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

/**
 * Redeem an access code
 */
export async function redeemAccessCode(code: string, userId: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .rpc('redeem_access_code', {
        p_code: code,
        p_user_id: userId
      })
    
    if (error) throw error
    
    const result = data as { success: boolean; error?: string; course_id?: string }
    
    if (!result.success) {
      return { error: { message: result.error || 'Failed to redeem code' } }
    }
    
    return { data: result }
  } catch (error: any) {
    return { error: { message: error.message || 'Failed to redeem code' } }
  }
}
