'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ backgroundColor: '#25292D', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#2A2A2A', borderRadius: '12px', padding: '40px', maxWidth: '500px', width: '90%', border: '2px solid #6A0DAD' }}>
        <h2 style={{ color: '#EFEFEF', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Dashboard Error</h2>
        <p style={{ color: '#B3B3B3', marginBottom: '16px' }}>The dashboard crashed. Error details:</p>
        <p style={{ color: '#ff6b6b', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '6px', marginBottom: '20px', wordBreak: 'break-word' }}>
          {error.message || 'Unknown error'}
        </p>
        <button
          onClick={reset}
          style={{ backgroundColor: '#6A0DAD', color: '#EFEFEF', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: 700, cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
