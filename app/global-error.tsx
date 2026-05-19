'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="da">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{
              width: 64, height: 64, background: '#fef2f2', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/><path d="M12 17h.01"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Kritisk fejl
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: 24 }}>
              Applikationen stødte på en kritisk fejl. Prøv at genindlæse.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.625rem 1.25rem', background: '#10b981', color: '#fff',
                border: 'none', borderRadius: 12, fontSize: '0.875rem',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Genindlæs
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
