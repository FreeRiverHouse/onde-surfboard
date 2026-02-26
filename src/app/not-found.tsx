export const runtime = 'edge'

export default function NotFound() {
  return (
    <html>
      <body>
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <h1 style={{ fontSize: '120px', margin: 0, color: '#22d3ee', opacity: 0.2 }}>404</h1>
          <h2 style={{ color: '#f0fdfa' }}>Pagina non trovata</h2>
          <p style={{ color: 'rgba(240, 253, 250, 0.6)' }}>La pagina che cerchi non esiste.</p>
          <a href="/" style={{
            display: 'inline-block',
            marginTop: '20px',
            padding: '12px 24px',
            background: 'linear-gradient(to right, #14b8a6, #22d3ee)',
            color: '#042f2e',
            textDecoration: 'none',
            borderRadius: '12px',
            fontWeight: 600
          }}>
            Torna alla Dashboard
          </a>
        </div>
      </body>
    </html>
  )
}
