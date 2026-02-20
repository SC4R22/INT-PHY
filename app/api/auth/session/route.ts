// This endpoint has been intentionally removed.
// It previously leaked user data publicly without auth gating.
// Session state is managed server-side via Supabase SSR cookies.
export const dynamic = 'force-dynamic'
export async function GET() {
  return new Response('Not Found', { status: 404 })
}
