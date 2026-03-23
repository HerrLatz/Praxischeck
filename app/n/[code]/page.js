'use client'
import { useState, useEffect } from 'react'

export default function NFCPage({ params }) {
  const code = params.code
  const [status, setStatus] = useState('loading')
  const [info, setInfo] = useState({})

  useEffect(() => {
    fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyCode: code, nfcVerified: true }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error === 'not_found') { setStatus('not_found'); return }
        setInfo({ name: data.company?.name, time: data.checkin?.lastTime || data.checkin?.time })
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [code])

  return (
    <div style={s.screen}>
      <div style={s.card}>
        {status === 'loading' && <p style={s.muted}>Einen Moment...</p>}

        {status === 'not_found' && <>
          <div style={{ ...s.icon, background: '#991b1b', borderColor: '#f87171' }}>✗</div>
          <p style={{ color: '#f87171', fontSize: 16, fontWeight: 600 }}>Betrieb nicht gefunden</p>
          <p style={s.muted}>Bitte wende dich an deine Lehrkraft.</p>
        </>}

        {status === 'ok' && <>
          <div style={{ ...s.icon, background: '#065f46', borderColor: '#34d399' }}>✓</div>
          <p style={{ color: '#34d399', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Anwesenheit bestätigt</p>
          <p style={{ color: '#22d3ee', fontFamily: "'Space Mono', monospace", fontSize: 16, marginBottom: 4 }}>
            {info.time} Uhr
          </p>
          <p style={s.muted}>{info.name}</p>
        </>}

        {status === 'error' && <>
          <div style={{ ...s.icon, background: '#991b1b', borderColor: '#f87171' }}>✗</div>
          <p style={{ color: '#f87171', fontSize: 14 }}>Fehler. Bitte erneut versuchen.</p>
        </>}
      </div>
    </div>
  )
}

const s = {
  screen: { minHeight: '100vh', background: 'linear-gradient(180deg, #0a0f1a, #0c1929)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans', sans-serif" },
  card: { background: '#111827', border: '1px solid #2a3550', borderRadius: 20, padding: '40px 28px', maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  icon: { width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '3px solid', marginBottom: 16 },
  muted: { color: '#94a3b8', fontSize: 14 },
}
