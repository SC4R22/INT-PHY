import { createClient } from './supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'student' | 'teacher' | 'admin'

export interface UserProfile {
  id: string
  full_name: string
  parent_name?: string
  phone_number: string
  parent_phone_number?: string
  role: UserRole
  avatar_url?: string
  created_at: string
  updated_at: string
}

/**
 * Get the current user's profile
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth(): Promise<UserProfile> {
  const profile = await getCurrentUser()
  
  if (!profile) {
    redirect('/login')
  }

  return profile
}

/**
 * Require a specific role - redirect to dashboard if insufficient permissions
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<UserProfile> {
  const profile = await requireAuth()

  if (!allowedRoles.includes(profile.role)) {
    redirect('/dashboard')
  }

  return profile
}

/**
 * Check if user has a specific role
 */
export function hasRole(profile: UserProfile, role: UserRole): boolean {
  return profile.role === role
}

/**
 * Check if user is a student
 */
export function isStudent(profile: UserProfile): boolean {
  return profile.role === 'student'
}

/**
 * Check if user is a teacher
 */
export function isTeacher(profile: UserProfile): boolean {
  return profile.role === 'teacher'
}

/**
 * Check if user is an admin
 */
export function isAdmin(profile: UserProfile): boolean {
  return profile.role === 'admin'
}

/**
 * Check if user can manage courses
 */
export function canManageCourses(profile: UserProfile): boolean {
  return profile.role === 'teacher' || profile.role === 'admin'
}

/**
 * Check if user can generate access codes
 */
export function canGenerateAccessCodes(profile: UserProfile): boolean {
  return profile.role === 'admin'
}

/**
 * Get appropriate redirect path based on user role
 */
export function getRoleBasedRedirect(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'teacher':
      return '/teacher/dashboard'
    case 'student':
    default:
      return '/dashboard'
  }
}
