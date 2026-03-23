'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const CLASSES = ['BPA', 'BPB', 'BPC', 'BPD', 'BPE']
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const DEFAULT_SCHOOL_DAYS = [3, 4] // Mi, Do

const T = {
  bg: '#0a0f1a', surface: '#111827', surfaceLight: '#1e293b', border: '#2a3550',
  accent: '#22d3ee', accentDim: '#0e7490',
  success: '#34d399', successDim: '#065f46',
  warning: '#fbbf24', warningDim: '#92400e',
  danger: '#f87171', dangerDim: '#991b1b',
  text: '#f1f5f9', textMuted: '#94a3b8', textDim: '#64748b',
  school: '#1a1a2e',
}

const PIE_COLORS = ['#34d399', '#fbbf24', '#f87171']

function qrUrl(text, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=svg`
}

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date
}

function getWeekLabel(mondayDate) {
  const d = new Date(mondayDate)
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const w = Math.ceil(((t - y) / 86400000 + 1) / 7)
  return `KW ${w}`
}

function getWeekDatesFromMonday(monday) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

// NRW Schulferien - Datum (YYYY-MM-DD) Bereiche
const NRW_FERIEN = [
  ['2026-03-30', '2026-04-11'], // Osterferien 2026
  ['2026-05-26', '2026-05-26'], // Pfingstferien 2026
  ['2026-07-20', '2026-09-01'], // Sommerferien 2026
  ['2026-10-17', '2026-10-31'], // Herbstferien 2026
  ['2026-12-23', '2027-01-06'], // Weihnachtsferien 2026/27
  ['2027-03-29', '2027-04-12'], // Osterferien 2027
  ['2027-05-25', '2027-05-25'], // Pfingstferien 2027
  ['2027-07-05', '2027-08-17'], // Sommerferien 2027
]

// Projektstart: 23.03.2026
const PROJECT_START = '2026-03-23'

function isInHoliday(dateStr) {
  return NRW_FERIEN.some(([start, end]) => dateStr >= start && dateStr <= end)
}

function isHolidayWeek(mondayStr, saturdayStr) {
  // Woche gilt als Ferienwoche wenn Mo-Fr komplett in den Ferien liegt
  const dates = []
  const m = new Date(mondayStr)
  for (let i = 0; i < 5; i++) {
    const d = new Date(m)
    d.setDate(m.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates.every(d => isInHoliday(d))
}

function getHolidayName(dateStr) {
  const labels = [
    ['2026-03-30', '2026-04-11', 'Osterferien'],
    ['2026-05-26', '2026-05-26', 'Pfingstferien'],
    ['2026-07-20', '2026-09-01', 'Sommerferien'],
    ['2026-10-17', '2026-10-31', 'Herbstferien'],
    ['2026-12-23', '2027-01-06', 'Weihnachtsferien'],
    ['2027-03-29', '2027-04-12', 'Osterferien'],
    ['2027-05-25', '2027-05-25', 'Pfingstferien'],
    ['2027-07-05', '2027-08-17', 'Sommerferien'],
  ]
  for (const [s, e, name] of labels) {
    if (dateStr >= s && dateStr <= e) return name
  }
  return 'Ferien'
}

function formatDate(d) {
  return `${d.split('-')[2]}.${d.split('-')[1]}.`
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:${T.bg};overflow-x:hidden}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:${T.surface}}
::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
input:focus,select:focus{outline:none;border-color:${T.accent}!important;box-shadow:0 0 0 3px ${T.accent}22}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes toastIn{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
.week-scroll{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
.week-col{scroll-snap-align:start;flex-shrink:0}
@media(max-width:768px){
  .app-layout{flex-direction:column!important}
  .sidebar{width:100%!important;min-width:100%!important;height:auto!important;position:relative!important;flex-direction:row!important;padding:8px!important;overflow-x:auto!important}
  .sidebar .logo-area,.sidebar .legend,.sidebar .stats-info,.sidebar .divider-line{display:none!important}
  .sidebar .nav-section{flex-direction:row!important;gap:2px!important}
  .sidebar .nav-section button{padding:8px 12px!important;font-size:12px!important;border-left:none!important;border-bottom:2px solid transparent!important;white-space:nowrap!important}
  .main-content{padding:12px!important}
  .stats-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}
  .stat-card{padding:14px!important}
  .stat-value{font-size:24px!important}
}
`

// ─── AUTH ───
function LoginScreen({ onLogin }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)

  const submit = async () => {
    const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) })
    const data = await r.json()
    if (data.ok) { localStorage.setItem('pk-auth', data.token); onLogin() }
    else setError(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: '48px 36px', maxWidth: 380, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: T.bg, marginBottom: 12 }}>✓</div>
          <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, color: T.text }}>PraxisCheck</h1>
          <p style={{ color: T.textDim, fontSize: 13, marginTop: 4 }}>Admin-Zugang</p>
        </div>
        <div style={{ marginBottom: 14 }}>
          <input style={S.input} placeholder="Benutzername" value={user} onChange={e => { setUser(e.target.value); setError(false) }} onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <input style={S.input} type="password" placeholder="Passwort" value={pass} onChange={e => { setPass(e.target.value); setError(false) }} onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        {error && <p style={{ color: T.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>Falsche Zugangsdaten</p>}
        <button style={{ ...S.btnPrimary, width: '100%' }} onClick={submit}>Anmelden</button>
      </div>
    </div>
  )
}

// ─── MAIN ───
export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [view, setView] = useState('dashboard')
  const [companies, setCompanies] = useState([])
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [schoolDays, setSchoolDays] = useState(DEFAULT_SCHOOL_DAYS)
  const [classFilter, setClassFilter] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => { if (localStorage.getItem('pk-auth')) setAuthed(true) }, [])

  const refresh = useCallback(async () => {
    const [co, ci] = await Promise.all([fetch('/api/companies').then(r => r.json()), fetch('/api/checkins').then(r => r.json())])
    setCompanies(co); setCheckins(ci); setLoading(false)
  }, [])

  useEffect(() => { if (authed) refresh() }, [authed, refresh])
  useEffect(() => { if (authed) { const i = setInterval(refresh, 30000); return () => clearInterval(i) } }, [authed, refresh])

  const showToast = useCallback((msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }, [])

  const apiCompanies = async (action, company, id) => {
    await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, company, id }) })
    refresh()
  }

  const manualCheckin = async (companyId, date, nfcVerified) => {
    await fetch('/api/manual-checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId, date, nfcVerified }) })
    refresh()
    showToast('Anwesenheit manuell eingetragen')
  }

  const deleteCheckin = async (companyId, date) => {
    if (!confirm('Anwesenheit für diesen Tag entfernen?')) return
    await fetch('/api/manual-checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId, date, action: 'delete' }) })
    refresh()
    showToast('Anwesenheit entfernt')
  }

  const resetData = async (type) => {
    if (!confirm(type === 'all' ? 'ALLE Daten löschen (Betriebe + Check-ins)?' : 'Alle Check-ins löschen?')) return
    await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
    refresh()
    showToast(type === 'all' ? 'Alle Daten gelöscht' : 'Check-ins gelöscht')
  }

  const logout = () => { localStorage.removeItem('pk-auth'); setAuthed(false) }

  if (!authed) return <><style>{CSS}</style><LoginScreen onLogin={() => setAuthed(true)} /></>
  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg }}><style>{CSS}</style><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin .8s linear infinite' }} /><p style={{ color: T.textMuted, marginTop: 16, fontFamily: 'DM Sans' }}>Lade Daten...</p></div>

  const filtered = classFilter ? companies.filter(c => c.klasse === classFilter) : companies

  return (
    <div className="app-layout" style={S.app}><style>{CSS}</style>
      {toast && <div style={{ ...S.toast, background: toast.type === 'success' ? T.successDim : T.dangerDim, borderColor: toast.type === 'success' ? T.success : T.danger }}>{toast.type === 'success' ? '✓ ' : '✗ '}{toast.msg}</div>}

      <nav className="sidebar" style={S.sidebar}>
        <div className="logo-area" style={S.logo}>
          <div style={S.logoIcon}>✓</div>
          <div><div style={S.logoText}>PraxisCheck</div><div style={S.logoSub}>Admin</div></div>
        </div>
        <div className="nav-section" style={S.navSection}>
          {[['dashboard', '◉', 'Dashboard'], ['companies', '◆', 'Betriebe'], ['export', '↓', 'CSV-Export'], ['settings', '⚙', 'Einstellungen']].map(([k, i, l]) => (
            <button key={k} onClick={() => setView(k)} style={{ ...S.navItem, ...(view === k ? S.navActive : {}) }}><span style={S.navIcon}>{i}</span>{l}</button>
          ))}
        </div>
        <div className="divider-line" style={S.divider} />
        <div className="stats-info" style={{ padding: '0 20px', fontSize: 12, color: T.textDim }}>{companies.length} Betriebe · {checkins.length} Check-ins</div>
        <div className="legend" style={{ marginTop: 'auto', padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.8 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: T.success, marginRight: 6, verticalAlign: 'middle' }} />NFC ✓
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: T.warning, marginRight: 6, marginLeft: 10, verticalAlign: 'middle' }} />QR
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: T.danger, marginRight: 6, marginLeft: 10, verticalAlign: 'middle' }} />Fehlt
          </div>
          <button onClick={logout} style={{ ...S.btnSmall, width: '100%', marginTop: 12, color: T.danger }}>Abmelden</button>
        </div>
      </nav>

      <main className="main-content" style={S.main}>
        {/* Class filter bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: T.textDim }}>Klasse:</span>
          <button onClick={() => setClassFilter('')} style={{ ...S.filterBtn, ...(classFilter === '' ? S.filterActive : {}) }}>Alle</button>
          {CLASSES.map(c => <button key={c} onClick={() => setClassFilter(c)} style={{ ...S.filterBtn, ...(classFilter === c ? S.filterActive : {}) }}>{c}</button>)}
        </div>

        {view === 'dashboard' && <Dashboard {...{ companies: filtered, allCompanies: companies, checkins, schoolDays, manualCheckin, deleteCheckin, refresh }} />}
        {view === 'companies' && <Companies {...{ companies, apiCompanies, showToast }} />}
        {view === 'export' && <ExportView {...{ companies: filtered, checkins, schoolDays }} />}
        {view === 'settings' && <Settings {...{ schoolDays, setSchoolDays, resetData }} />}
      </main>
    </div>
  )
}

// ─── DASHBOARD ───
function Dashboard({ companies, allCompanies, checkins, schoolDays, manualCheckin, deleteCheckin, refresh }) {
  const [expandedCompany, setExpandedCompany] = useState(null)
  const [showSchoolDays, setShowSchoolDays] = useState(false)
  const scrollRef = useRef(null)
  const todayStr = new Date().toISOString().split('T')[0]
  const currentMonday = getMonday(new Date())

  // Generate weeks: from project start, skip holiday weeks
  const weeks = []
  const projectMonday = getMonday(new Date(PROJECT_START))
  for (let i = 0; i < 52; i++) {
    const m = new Date(projectMonday)
    m.setDate(m.getDate() + i * 7)
    const dates = getWeekDatesFromMonday(m)
    const mondayStr = dates[0]
    const saturdayStr = dates[5]
    if (isHolidayWeek(mondayStr, saturdayStr)) {
      weeks.push({ monday: new Date(m), dates, label: getWeekLabel(m), holiday: getHolidayName(mondayStr) })
    } else {
      weeks.push({ monday: new Date(m), dates, label: getWeekLabel(m), holiday: null })
    }
  }

  // Scroll to current week on mount
  useEffect(() => {
    if (scrollRef.current) {
      const currentEl = scrollRef.current.querySelector('[data-current="true"]')
      if (currentEl) currentEl.scrollIntoView({ inline: 'start', behavior: 'auto' })
    }
  }, [])

  // Today stats
  const todayCI = checkins.filter(c => c.date === todayStr)
  const todayCompanyIds = new Set(todayCI.map(c => c.companyId))
  const checkedIn = companies.filter(c => todayCompanyIds.has(c.id)).length
  const nfcCount = todayCI.filter(c => c.nfcVerified && companies.some(co => co.id === c.companyId)).length
  const qrCount = todayCI.filter(c => !c.nfcVerified && companies.some(co => co.id === c.companyId)).length

  const isPracticeDay = (dateStr) => {
    const day = new Date(dateStr).getDay()
    return !schoolDays.includes(day) && day !== 0 && day !== 6
  }

  const isSaturday = (dateStr) => new Date(dateStr).getDay() === 6

  return (
    <div style={{ animation: 'fadeIn .3s ease' }}>
      {/* Stats */}
      <div className="stats-grid" style={S.statsGrid}>
        <div className="stat-card" style={{ ...S.card, padding: 20 }}>
          <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Heute eingecheckt</div>
          <div className="stat-value" style={{ fontSize: 32, fontWeight: 700, color: T.success, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>{checkedIn}/{companies.length}</div>
          <div style={{ fontSize: 12, color: T.textDim, marginTop: 6 }}>{companies.length - checkedIn} fehlen</div>
        </div>
        <div className="stat-card" style={{ ...S.card, padding: 20 }}>
          <div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>NFC / QR / Fehlt</div>
          <div className="stat-value" style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>
            <span style={{ color: T.success }}>{nfcCount}</span>
            <span style={{ color: T.textDim }}> / </span>
            <span style={{ color: T.warning }}>{qrCount}</span>
            <span style={{ color: T.textDim }}> / </span>
            <span style={{ color: T.danger }}>{companies.length - checkedIn}</span>
          </div>
        </div>
      </div>

      {/* School days toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={S.h2}>Wochenübersicht</h2>
        <button style={S.btnSmall} onClick={() => setShowSchoolDays(!showSchoolDays)}>
          {showSchoolDays ? 'Schultage ausblenden' : 'Schultage einblenden'}
        </button>
      </div>

      {/* Horizontal scrollable weeks */}
      <div style={S.card}>
        <div ref={scrollRef} className="week-scroll" style={{ gap: 0 }}>
          {weeks.map((week, wi) => {
            const isCurrent = week.dates.includes(todayStr)

            // Holiday week: show as compact indicator
            if (week.holiday) {
              return (
                <div key={wi} className="week-col" style={{ borderRight: `1px solid ${T.border}`, minWidth: 120, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '8px 12px', background: '#1a1520', borderBottom: `2px solid ${T.border}`, fontFamily: "'Space Mono', monospace", fontSize: 12, color: T.textDim, fontWeight: 600, textAlign: 'center' }}>
                    {week.label}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 12px', color: T.textDim, fontSize: 12, textAlign: 'center' }}>
                    🏖 {week.holiday}
                  </div>
                </div>
              )
            }

            const visibleDates = week.dates.filter(d => {
              const day = new Date(d).getDay()
              if (day === 0) return false
              if (!showSchoolDays && schoolDays.includes(day)) return false
              return true
            })
            return (
              <div key={wi} className="week-col" data-current={isCurrent ? 'true' : 'false'} style={{ borderRight: `1px solid ${T.border}`, minWidth: visibleDates.length * 90 + 200 }}>
                <div style={{ padding: '8px 12px', background: isCurrent ? T.accentDim + '33' : 'transparent', borderBottom: `2px solid ${isCurrent ? T.accent : T.border}`, fontFamily: "'Space Mono', monospace", fontSize: 13, color: isCurrent ? T.accent : T.textDim, fontWeight: 600 }}>
                  {week.label} · {formatDate(week.dates[0])} – {formatDate(week.dates[5])}
                </div>
                <table style={{ ...S.table, marginBottom: 0 }}>
                  <thead>
                    <tr>
                      {wi === 0 && <th style={{ ...S.th, minWidth: 60, position: 'sticky', left: 0, background: T.surface, zIndex: 2 }}>Kürzel</th>}
                      {wi === 0 && <th style={{ ...S.th, minWidth: 130, position: 'sticky', left: 60, background: T.surface, zIndex: 2 }}>Betrieb</th>}
                      {wi !== 0 && <th style={{ ...S.th, minWidth: 60 }}></th>}
                      {wi !== 0 && <th style={{ ...S.th, minWidth: 130 }}></th>}
                      {visibleDates.map(d => {
                        const day = new Date(d).getDay()
                        const isSchool = schoolDays.includes(day)
                        const isSat = day === 6
                        return (
                          <th key={d} style={{ ...S.th, textAlign: 'center', minWidth: 80, background: isSchool ? T.school : isSat ? '#1a1520' : 'transparent', color: d === todayStr ? T.accent : T.textDim }}>
                            {WEEKDAYS[day]} {formatDate(d)}
                            {isSchool && <div style={{ fontSize: 8, color: T.textDim }}>Schule</div>}
                            {isSat && <div style={{ fontSize: 8, color: T.textDim }}>Sa</div>}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map(co => (
                      <tr key={co.id}>
                        {wi === 0 && <td style={{ ...S.td, fontWeight: 700, color: T.accent, fontFamily: "'Space Mono', monospace", position: 'sticky', left: 0, background: T.surface, zIndex: 1, cursor: 'pointer' }} onClick={() => setExpandedCompany(expandedCompany === co.id ? null : co.id)}>{co.code}</td>}
                        {wi === 0 && <td style={{ ...S.td, color: T.text, position: 'sticky', left: 60, background: T.surface, zIndex: 1, cursor: 'pointer' }} onClick={() => setExpandedCompany(expandedCompany === co.id ? null : co.id)}>{co.name} <span style={{ color: T.textDim, fontSize: 11 }}>{expandedCompany === co.id ? '▲' : '▼'}</span></td>}
                        {wi !== 0 && <td style={{ ...S.td, fontWeight: 700, color: T.accent, fontFamily: "'Space Mono', monospace", cursor: 'pointer' }} onClick={() => setExpandedCompany(expandedCompany === co.id ? null : co.id)}>{co.code}</td>}
                        {wi !== 0 && <td style={{ ...S.td, color: T.text, cursor: 'pointer' }} onClick={() => setExpandedCompany(expandedCompany === co.id ? null : co.id)}>{co.name} <span style={{ color: T.textDim, fontSize: 11 }}>{expandedCompany === co.id ? '▲' : '▼'}</span></td>}
                        {visibleDates.map(d => {
                          const day = new Date(d).getDay()
                          const isSchool = schoolDays.includes(day)
                          const isSat = day === 6
                          const ci = checkins.find(c => c.companyId === co.id && c.date === d)
                          const bgCol = isSchool ? T.school : isSat ? '#1a1520' : 'transparent'
                          return (
                            <td key={d} style={{ ...S.td, textAlign: 'center', background: bgCol, cursor: 'pointer', position: 'relative' }}
                              onClick={() => {
                                if (ci) deleteCheckin(co.id, d)
                                else manualCheckin(co.id, d, true)
                              }}
                              title={ci ? `${ci.time}${ci.manual ? ' (manuell)' : ''} – Klicken zum Entfernen` : 'Klicken für manuellen Eintrag'}>
                              {ci ? (
                                <span style={{ ...S.badge, background: ci.nfcVerified ? T.successDim : T.warningDim, color: ci.nfcVerified ? T.success : T.warning, fontSize: 11 }}>
                                  {ci.time === 'manuell' ? '✎' : ci.time} {ci.nfcVerified ? '✓' : '⚠'}
                                </span>
                              ) : d <= todayStr && !isSchool && !isSat ? (
                                <span style={{ ...S.badge, background: T.dangerDim, color: T.danger, fontSize: 11 }}>✗</span>
                              ) : <span style={{ color: T.textDim, fontSize: 11 }}>–</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>

      {/* Expanded company stats */}
      {expandedCompany && <CompanyStats companyId={expandedCompany} companies={companies} checkins={checkins} schoolDays={schoolDays} />}
    </div>
  )
}

// ─── COMPANY STATS ───
function CompanyStats({ companyId, companies, checkins, schoolDays }) {
  const company = companies.find(c => c.id === companyId)
  if (!company) return null

  const companyCheckins = checkins.filter(c => c.companyId === companyId).sort((a, b) => b.date.localeCompare(a.date))
  const nfcCount = companyCheckins.filter(c => c.nfcVerified).length
  const qrCount = companyCheckins.filter(c => !c.nfcVerified).length
  const total = companyCheckins.length

  // Anwesenheit nach Wochentag
  const dayStats = [1, 2, 3, 4, 5, 6].map(day => ({
    name: WEEKDAYS[day],
    anwesend: companyCheckins.filter(c => new Date(c.date).getDay() === day).length,
    isSchool: schoolDays.includes(day),
  }))

  // Pie data
  const pieData = [
    { name: 'NFC ✓', value: nfcCount },
    { name: 'Nur QR', value: qrCount },
  ].filter(d => d.value > 0)

  // Letzte 8 Wochen Trend
  const weekTrend = []
  const now = new Date()
  for (let i = 7; i >= 0; i--) {
    const m = getMonday(new Date(now.getTime() - i * 7 * 86400000))
    const dates = getWeekDatesFromMonday(m)
    const practiceDates = dates.filter(d => { const day = new Date(d).getDay(); return !schoolDays.includes(day) && day !== 0 && day !== 6 })
    const count = companyCheckins.filter(c => practiceDates.includes(c.date)).length
    weekTrend.push({ name: getWeekLabel(m), tage: count, max: practiceDates.length })
  }

  return (
    <div style={{ ...S.card, animation: 'fadeIn .3s ease', marginTop: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: T.accent }}>{company.code} · {company.name}</h3>
        <span style={{ fontSize: 12, color: T.textDim }}>{total} Check-ins gesamt · {company.klasse || '–'}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Verifizierung Pie */}
        <div style={{ background: T.surfaceLight, borderRadius: 10, padding: 16 }}>
          <h4 style={{ fontSize: 12, color: T.textMuted, marginBottom: 12, textTransform: 'uppercase' }}>Verifizierung</h4>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: T.textDim, fontSize: 13 }}>Keine Daten</p>}
        </div>

        {/* Wochentag Bar */}
        <div style={{ background: T.surfaceLight, borderRadius: 10, padding: 16 }}>
          <h4 style={{ fontSize: 12, color: T.textMuted, marginBottom: 12, textTransform: 'uppercase' }}>Anwesenheit nach Wochentag</h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dayStats}>
              <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 11 }} />
              <YAxis tick={{ fill: T.textDim, fontSize: 11 }} />
              <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} />
              <Bar dataKey="anwesend" fill={T.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Wochen-Trend */}
        <div style={{ background: T.surfaceLight, borderRadius: 10, padding: 16 }}>
          <h4 style={{ fontSize: 12, color: T.textMuted, marginBottom: 12, textTransform: 'uppercase' }}>Trend letzte 8 Wochen</h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weekTrend}>
              <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 10 }} />
              <YAxis tick={{ fill: T.textDim, fontSize: 11 }} />
              <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} />
              <Bar dataKey="tage" fill={T.success} radius={[4, 4, 0, 0]} name="Anwesend" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Check-in Liste */}
      <div style={{ marginTop: 16 }}>
        <h4 style={{ fontSize: 12, color: T.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>Alle Check-ins</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {companyCheckins.slice(0, 30).map(ci => (
            <span key={ci.id} style={{ ...S.badge, background: ci.nfcVerified ? T.successDim : T.warningDim, color: ci.nfcVerified ? T.success : T.warning, fontSize: 11 }}>
              {ci.date.split('-').reverse().join('.')} {ci.time}{ci.manual ? ' ✎' : ''} {ci.nfcVerified ? '✓' : '⚠'}
            </span>
          ))}
          {companyCheckins.length > 30 && <span style={{ fontSize: 11, color: T.textDim }}>+{companyCheckins.length - 30} weitere</span>}
        </div>
      </div>
    </div>
  )
}

// ─── COMPANIES ───
function Companies({ companies, apiCompanies, showToast }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', klasse: '' })
  const [editId, setEditId] = useState(null)
  const [showQR, setShowQR] = useState(null)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const nextCode = () => { const used = companies.map(c => c.code); for (let i = 1; i < 1000; i++) { const cd = String(i).padStart(3, '0'); if (!used.includes(cd)) return cd } return '999' }

  const submit = async () => {
    if (!form.name.trim()) return
    const code = form.code.trim() || nextCode()
    if (editId) { await apiCompanies('update', { ...form, code, id: editId }); showToast('Betrieb aktualisiert') }
    else { await apiCompanies('add', { id: Date.now().toString(), ...form, code }); showToast('Betrieb hinzugefügt') }
    setForm({ name: '', code: '', klasse: '' }); setShowForm(false); setEditId(null)
  }

  return (
    <div style={{ animation: 'fadeIn .3s ease' }}>
      <div style={S.header}>
        <div><h1 style={S.h1}>Betriebe</h1></div>
        <button style={S.btnPrimary} onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', code: nextCode(), klasse: '' }) }}>+ Hinzufügen</button>
      </div>

      {showForm && (
        <div style={{ ...S.card, borderColor: T.accent, marginBottom: 16 }}>
          <div style={S.formGrid}>
            <div><label style={S.label}>Betriebsname *</label><input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Netto Kleve" /></div>
            <div><label style={S.label}>Kürzel</label><input style={S.input} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div><label style={S.label}>Klasse</label>
              <select style={S.input} value={form.klasse} onChange={e => setForm({ ...form, klasse: e.target.value })}>
                <option value="">– Klasse wählen –</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button style={S.btnPrimary} onClick={submit}>{editId ? 'Speichern' : 'Hinzufügen'}</button>
            <button style={S.btnGhost} onClick={() => { setShowForm(false); setEditId(null) }}>Abbrechen</button>
          </div>
        </div>
      )}

      {showQR && (
        <div style={S.modal} onClick={() => setShowQR(null)}>
          <div style={S.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...S.h2, textAlign: 'center', marginBottom: 4 }}>{showQR.name}</h3>
            <p style={{ textAlign: 'center', fontFamily: "'Space Mono', monospace", color: T.accent, fontSize: 20, marginBottom: 16 }}>{showQR.code}</p>
            <div style={{ textAlign: 'center', background: '#fff', borderRadius: 12, padding: 20, marginBottom: 12 }}>
              <img src={qrUrl(`${baseUrl}/c/${showQR.code}`, 220)} alt="QR" style={{ width: 220, height: 220 }} />
            </div>
            <div style={{ background: T.surfaceLight, borderRadius: 8, padding: 10, fontSize: 11, color: T.textMuted, marginBottom: 12 }}>
              <div><strong style={{ color: T.text }}>QR:</strong> <code style={{ color: T.warning }}>{baseUrl}/c/{showQR.code}</code></div>
              <div style={{ marginTop: 6 }}><strong style={{ color: T.text }}>NFC:</strong> <code style={{ color: T.success }}>{baseUrl}/n/{showQR.code}</code></div>
              <div style={{ marginTop: 8, borderTop: `1px solid ${T.border}`, paddingTop: 8, color: T.textDim }}>NFC-Tag mit "NFC Tools" → Schreiben → URL → die grüne URL eintragen</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...S.btnPrimary, flex: 1 }} onClick={() => window.print()}>Drucken</button>
              <button style={{ ...S.btnGhost, flex: 1 }} onClick={() => setShowQR(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {companies.length === 0 ? <div style={S.card}><Empty text="Noch keine Betriebe." /></div> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {companies.map(c => (
            <div key={c.id} style={{ ...S.card, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: T.accent }}>{c.code}</span>
                  <span style={{ color: T.text, fontSize: 15 }}>{c.name}</span>
                  {c.klasse && <span style={{ ...S.badge, background: T.surfaceLight, color: T.textMuted, fontSize: 11 }}>{c.klasse}</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={S.btnSmall} onClick={() => setShowQR(c)}>QR</button>
                  <button style={S.btnSmall} onClick={() => { setForm({ name: c.name, code: c.code, klasse: c.klasse || '' }); setEditId(c.id); setShowForm(true) }}>✎</button>
                  <button style={{ ...S.btnSmall, color: T.danger }} onClick={async () => { await apiCompanies('delete', null, c.id); showToast('Gelöscht') }}>✗</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── EXPORT ───
function ExportView({ companies, checkins, schoolDays }) {
  const [weeksBack, setWeeksBack] = useState(1)
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const allDates = []
  for (let i = weeksBack - 1; i >= 0; i--) {
    const m = getMonday(new Date(now.getTime() - i * 7 * 86400000))
    getWeekDatesFromMonday(m).forEach(d => {
      const day = new Date(d).getDay()
      if (day !== 0) allDates.push(d)
    })
  }

  const downloadCSV = () => {
    const header = ['Kürzel', 'Betrieb', 'Klasse', ...allDates.map(d => `${WEEKDAYS[new Date(d).getDay()]} ${d}`)]
    const rows = companies.map(co => {
      const cols = allDates.map(d => {
        const day = new Date(d).getDay()
        const isSchool = schoolDays.includes(day)
        const ci = checkins.find(c => c.companyId === co.id && c.date === d)
        if (ci) return ci.nfcVerified ? `${ci.time} NFC` : `${ci.time} QR`
        if (isSchool) return 'Schultag'
        if (day === 6) return '-'
        if (d <= todayStr) return 'FEHLT'
        return '-'
      })
      return [co.code, co.name, co.klasse || '', ...cols]
    })
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `PraxisCheck_Export.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ animation: 'fadeIn .3s ease' }}>
      <div style={S.header}>
        <h1 style={S.h1}>CSV-Export</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: T.textMuted }}>Zeitraum:</span>
          <select style={{ ...S.input, width: 'auto' }} value={weeksBack} onChange={e => setWeeksBack(Number(e.target.value))}>
            <option value={1}>Aktuelle Woche</option>
            <option value={2}>2 Wochen</option>
            <option value={4}>4 Wochen</option>
            <option value={8}>8 Wochen</option>
            <option value={52}>Ganzes Jahr</option>
          </select>
        </div>
      </div>
      <div style={S.card}>
        <p style={{ color: T.textMuted, fontSize: 14, marginBottom: 16 }}>
          Die CSV enthält: Kürzel, Betriebsname, Klasse und für jeden Tag den Check-in-Status (NFC/QR/FEHLT/Schultag). Öffne die Datei in Excel und verknüpfe sie per SVERWEIS mit deiner lokalen Zuordnungstabelle.
        </p>
        <button style={S.btnPrimary} onClick={downloadCSV}>↓ CSV herunterladen</button>
      </div>
    </div>
  )
}

// ─── SETTINGS ───
function Settings({ schoolDays, setSchoolDays, resetData }) {
  const toggleDay = (day) => {
    setSchoolDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  return (
    <div style={{ animation: 'fadeIn .3s ease' }}>
      <h1 style={{ ...S.h1, marginBottom: 24 }}>Einstellungen</h1>

      <div style={S.card}>
        <h2 style={S.h2}>Schultage festlegen</h2>
        <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 12 }}>An Schultagen wird kein Check-in erwartet. Sie werden im Dashboard grau dargestellt.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['Mo', 1], ['Di', 2], ['Mi', 3], ['Do', 4], ['Fr', 5], ['Sa', 6]].map(([label, day]) => (
            <button key={day} onClick={() => toggleDay(day)} style={{
              padding: '8px 16px', borderRadius: 8, border: `1px solid ${schoolDays.includes(day) ? T.accent : T.border}`,
              background: schoolDays.includes(day) ? T.accentDim + '44' : T.surfaceLight,
              color: schoolDays.includes(day) ? T.accent : T.textMuted, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif"
            }}>{label} {schoolDays.includes(day) ? '✓' : ''}</button>
          ))}
        </div>
      </div>

      <div style={{ ...S.card, borderColor: T.danger + '44' }}>
        <h2 style={{ ...S.h2, color: T.danger }}>Daten zurücksetzen</h2>
        <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 12 }}>Vorsicht: Diese Aktionen können nicht rückgängig gemacht werden.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={{ ...S.btnSmall, color: T.warning, borderColor: T.warning + '44' }} onClick={() => resetData('checkins')}>Alle Check-ins löschen</button>
          <button style={{ ...S.btnSmall, color: T.danger, borderColor: T.danger + '44' }} onClick={() => resetData('all')}>ALLE Daten löschen</button>
        </div>
      </div>
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textDim }}><div style={{ fontSize: 28, marginBottom: 8, opacity: .4 }}>◇</div><p>{text}</p></div>
}

const S = {
  app: { display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: T.text, background: T.bg },
  sidebar: { width: 210, minWidth: 210, background: T.surface, borderRight: `1px solid ${T.border}`, padding: '16px 0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 20px', borderBottom: `1px solid ${T.border}`, marginBottom: 16 },
  logoIcon: { width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: T.bg },
  logoText: { fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: T.text },
  logoSub: { fontSize: 10, color: T.textDim, letterSpacing: '1px', textTransform: 'uppercase' },
  navSection: { display: 'flex', flexDirection: 'column', gap: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: 'none', border: 'none', color: T.textMuted, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer', textAlign: 'left', borderLeft: '3px solid transparent' },
  navActive: { color: T.accent, background: `${T.accent}0a`, borderLeftColor: T.accent },
  navIcon: { fontSize: 13, width: 18, textAlign: 'center' },
  divider: { height: 1, background: T.border, margin: '12px 16px' },
  main: { flex: 1, padding: 24, overflowY: 'auto', maxWidth: 1300 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  h1: { fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: T.text },
  h2: { fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 },
  headerSub: { fontSize: 13, color: T.textMuted },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 20 },
  card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: `2px solid ${T.border}`, color: T.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: "'Space Mono', monospace", fontWeight: 400 },
  td: { padding: '8px 10px', borderBottom: `1px solid ${T.border}22`, color: T.textMuted, fontSize: 12 },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 5, fontWeight: 500, fontFamily: "'Space Mono', monospace" },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  label: { display: 'block', fontSize: 11, color: T.textMuted, marginBottom: 4, fontWeight: 500 },
  input: { width: '100%', padding: '8px 10px', background: T.surfaceLight, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif" },
  btnPrimary: { padding: '9px 18px', background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`, color: T.bg, border: 'none', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnGhost: { padding: '9px 18px', background: T.surfaceLight, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: 'pointer' },
  btnSmall: { padding: '5px 10px', background: T.surfaceLight, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  filterBtn: { padding: '5px 12px', background: T.surfaceLight, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  filterActive: { background: T.accentDim + '44', color: T.accent, borderColor: T.accent },
  toast: { position: 'fixed', top: 16, right: 16, padding: '10px 18px', borderRadius: 10, border: '1px solid', color: '#fff', fontSize: 13, fontWeight: 500, zIndex: 9999, animation: 'toastIn .3s ease', fontFamily: "'DM Sans', sans-serif" },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modalContent: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, maxWidth: 420, width: '100%' },
}
