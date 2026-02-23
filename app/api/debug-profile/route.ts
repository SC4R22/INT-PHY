// This debug endpoint has been removed for security.
// It previously exposed env var metadata and user profile data without authentication.
export async function GET() {
  return new Response('Not Found', { status: 404 })
}
