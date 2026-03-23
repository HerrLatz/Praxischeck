'use client'
import { useState, useEffect } from 'react'

export default function QRPage({ params }) {
  const code = params.code
  const [status, setStatus] = useState('loading')
  const [info, setInfo] = useState({})

  useEffect(() => {
    fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyCode: code, nfcVerified: false }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error === 'not_found') { setStatus('not_found'); return }
        if (data.status === 'already_done') { setStatus('already_done'); return }
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

        {status === 'already_done' && <>
          <div style={{ ...s.icon, background: '#065f46', borderColor: '#34d399' }}>✓</div>
          <p style={{ color: '#34d399', fontSize: 16, fontWeight: 600 }}>Heute bereits eingecheckt</p>
        </>}

        {status === 'ok' && <>
          <div style={{ ...s.icon, background: '#92400e', borderColor: '#fbbf24' }}>⚠</div>
          <p style={{ color: '#fbbf24', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Eingecheckt – nur QR</p>
          <p style={s.muted}>
            {info.time} Uhr · {info.name}
          </p>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 16, lineHeight: 1.5 }}>
            Bitte halte jetzt dein Handy an den NFC-Tag,<br />um den Check-in zu bestätigen.
          </p>
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
