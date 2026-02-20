'use server'

import { createClient } from '@/lib/supabase/server'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const randomBytes = new Uint8Array(12)
  crypto.getRandomValues(randomBytes)
  let code = ''
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-'
    code += chars[randomBytes[i] % chars.length]
  }
  return code
}

export async function generateAccessCodes(
  courseId: string,
  quantity: number,
  expiresInDays?: number
): Promise<{ success: boolean; error?: string; count?: number }> {
  // ── Auth & role check (server-side) ──────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Only admins can generate access codes' }
  }

  // ── Input validation ──────────────────────────────────────────────────────
  if (!courseId || typeof courseId !== 'string' || courseId.trim().length === 0) {
    return { success: false, error: 'Invalid course ID' }
  }
  const safeQuantity = Math.max(1, Math.min(100, Math.floor(Number(quantity) || 1)))

  let expiresAt: string | null = null
  if (expiresInDays) {
    const days = Math.max(1, Math.min(3650, Math.floor(Number(expiresInDays))))
    expiresAt = new Date(Date.now() + days * 86_400_000).toISOString()
  }

  // ── Verify the course exists and is not deleted ───────────────────────────
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId.trim())
    .is('deleted_at', null)
    .single()

  if (!course) {
    return { success: false, error: 'Course not found' }
  }

  // ── Insert codes ──────────────────────────────────────────────────────────
  const newCodes = Array.from({ length: safeQuantity }, () => ({
    code: generateCode(),
    course_id: courseId.trim(),
    is_used: false,
    created_by: user.id,
    expires_at: expiresAt,
  }))

  const { error: insertError } = await supabase.from('access_codes').insert(newCodes)

  if (insertError) {
    console.error('Access code insert error:', insertError)
    return { success: false, error: 'Failed to generate codes. Please try again.' }
  }

  return { success: true, count: safeQuantity }
}

export async function deleteAccessCode(
  codeId: string
): Promise<{ success: boolean; error?: string }> {
  // ── Auth & role check ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Only admins can delete access codes' }
  }

  if (!codeId || typeof codeId !== 'string') {
    return { success: false, error: 'Invalid code ID' }
  }

  const { error } = await supabase
    .from('access_codes')
    .delete()
    .eq('id', codeId)
    .eq('is_used', false) // Safety: never delete already-used codes

  if (error) {
    return { success: false, error: 'Failed to delete code' }
  }

  return { success: true }
}
