'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const CLASSES = ['BPA', 'BPB', 'BPC', 'BPD', 'BPE']
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const DEFAULT_SCHOOL_DAYS = [3, 4]

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
  date.setHours(12, 0, 0, 0)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date
}

function getWeekLabel(mondayDate) {
  const d = new Date(mondayDate)
  d.setHours(12, 0, 0, 0)
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const w = Math.ceil(((t - y) / 86400000 + 1) / 7)
  return `KW ${w}`
}

function getWeekDatesFromMonday(monday) {
  const m = new Date(monday)
  m.setHours(12, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(m)
    d.setDate(m.getDate() + i)
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  })
}

const NRW_FERIEN = [
  ['2026-03-30', '2026-04-11'],
  ['2026-05-26', '2026-05-26'],
  ['2026-07-20', '2026-09-01'],
  ['2026-10-17', '2026-10-31'],
  ['2026-12-23', '2027-01-06'],
  ['2027-03-29', '2027-04-12'],
  ['2027-05-25', '2027-05-25'],
  ['2027-07-05', '2027-08-17'],
]

const PROJECT_START = '2026-04-13'

function isInHoliday(dateStr) {
  return NRW_FERIEN.some(([start, end]) => dateStr >= start && dateStr <= end)
}

function isHolidayWeek(mondayStr, sundayStr) {
  const m = new Date(mondayStr + 'T12:00:00')
  for (let i = 0; i < 5; i++) {
    const d = new Date(m)
    d.setDate(m.getDate() + i)
    const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    if (!isInHoliday(ds)) return false
  }
  return true
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

const CSS = `*{box-sizing:border-box;margin:0;padding:0} body{background:${T.bg};overflow-x:hidden} ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:${T.surface}} ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px} input:focus,select:focus{outline:none;border-color:${T.accent}!important;box-shadow:0 0 0 3px ${T.accent}22} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}} @keyframes toastIn{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}} .week-scroll{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:thin} .week-col{scroll-snap-align:start;flex-shrink:0} @media(max-width:768px){ .app-layout{flex-direction:column!important} .sidebar{width:100%!important;min-width:100%!important;height:auto!important;position:relative!important;flex-direction:row!important;padding:8px!important;overflow-x:auto!important} .sidebar .logo-area,.sidebar .legend,.sidebar .stats-info,.sidebar .divider-line{display:none!important} .sidebar .nav-section{flex-direction:row!important;gap:2px!important} .sidebar .nav-section button{padding:8px 12px!important;font-size:12px!important;border-left:none!important;border-bottom:2px solid transparent!important;white-space:nowrap!important} .main-content{padding:12px!important} .stats-grid{grid-template-columns:repeat(2,1fr)!important;gap:8px!important} .stat-card{padding:14px!important} .stat-value{font-size:24px!important} }`

function LoginScreen({ onLogin }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)
  const submit = async () => {
    const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) })
    const data = await r.json()
    if (data.ok) { onLogin(data) } else setError(true)
  }
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: '48px 36px', maxWidth: 380, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: T.bg, marginBottom: 12 }}>{"\u2713"}</div>
          <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, color: T.text }}>PraxisCheck</h1>
          <p style={{ color: T.textDim, fontSize: 13, marginTop: 4 }}>Anmeldung</p>
        </div>
        <div style={{ marginBottom: 14 }}><input style={S.input} placeholder="Benutzername" value={user} onChange={e => { setUser(e.target.value); setError(false) }} onKeyDown={e => e.key === 'Enter' && submit()} /></div>
        <div style={{ marginBottom: 20 }}><input style={S.input} type="password" placeholder="Passwort" value={pass} onChange={e => { setPass(e.target.value); setError(false) }} onKeyDown={e => e.key === 'Enter' && submit()} /></div>
        {error && <p style={{ color: T.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>Falsche Zugangsdaten</p>}
        <button style={{ ...S.btnPrimary, width: '100%' }} onClick={submit}>Anmelden</button>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [userKlasse, setUserKlasse] = useState(null)
  const [userName, setUserName] = useState('')
  const [view, setView] = useState('dashboard')
  const [companies, setCompanies] = useState([])
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [schoolDays, setSchoolDays] = useState(DEFAULT_SCHOOL_DAYS)
  const [classFilter, setClassFilter] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => { const saved = localStorage.getItem('pk-auth-data'); if (saved) { try { const data = JSON.parse(saved); setAuthed(true); setUserRole(data.role); setUserKlasse(data.klasse); setUserName(data.username); if (data.klasse) setClassFilter(data.klasse) } catch { localStorage.removeItem('pk-auth-data') } } }, [])

  const handleLogin = (data) => { localStorage.setItem('pk-auth', data.token); localStorage.setItem('pk-auth-data', JSON.stringify({ role: data.role, klasse: data.klasse, username: data.username })); setAuthed(true); setUserRole(data.role); setUserKlasse(data.klasse); setUserName(data.username); if (data.klasse) setClassFilter(data.klasse) }

  const refresh = useCallback(async () => { const [co, ci] = await Promise.all([fetch('/api/companies').then(r => r.json()), fetch('/api/checkins').then(r => r.json())]); setCompanies(co); setCheckins(ci); setLoading(false) }, [])
  useEffect(() => { if (authed) refresh() }, [authed, refresh])
  useEffect(() => { if (authed) { const i = setInterval(refresh, 30000); return () => clearInterval(i) } }, [authed, refresh])
  const showToast = useCallback((msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }, [])

  const apiCompanies = async (action, company, id) => { await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, company, id }) }); refresh() }
  const manualCheckin = async (companyId, date, nfcVerified) => { await fetch('/api/manual-checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId, date, nfcVerified }) }); refresh(); showToast('Anwesenheit manuell eingetragen') }
  const deleteCheckin = async (companyId, date) => { if (!confirm('Anwesenheit f\u00fcr diesen Tag entfernen?')) return; await fetch('/api/manual-checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId, date, action: 'delete' }) }); refresh(); showToast('Anwesenheit entfernt') }
  const resetData = async (payload) => { const pw = prompt('Bitte Admin-Passwort eingeben:'); if (!pw) return; const authCheck = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: pw }) }); const authData = await authCheck.json(); if (!authData.ok) { alert('Falsches Passwort!'); return }; if (!confirm('Wirklich unwiderruflich l\u00f6schen?')) return; const res = await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await res.json(); refresh(); showToast(data.deleted !== undefined ? `${data.deleted} Eintr\u00e4ge gel\u00f6scht` : 'Gel\u00f6scht') }
  const logout = () => { localStorage.removeItem('pk-auth'); localStorage.removeItem('pk-auth-data'); setAuthed(false); setUserRole(null); setUserKlasse(null); setUserName('') }

  if (!authed) return <><style>{CSS}</style><LoginScreen onLogin={handleLogin} /></>
  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg }}><style>{CSS}</style><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin .8s linear infinite' }} /><p style={{ color: T.textMuted, marginTop: 16, fontFamily: 'DM Sans' }}>Lade Daten...</p></div>

  const filtered = (classFilter ? companies.filter(c => c.klasse === classFilter) : companies).slice().sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const activeCompanies = filtered.filter(c => !c.archived)
  const archivedCompanies = filtered.filter(c => c.archived)

  return (
    <div className="app-layout" style={S.app}><style>{CSS}</style>
      {toast && <div style={{ ...S.toast, background: toast.type === 'success' ? T.successDim : T.dangerDim, borderColor: toast.type === 'success' ? T.success : T.danger }}>{toast.type === 'success' ? '\u2713 ' : '\u2717 '}{toast.msg}</div>}
      <nav className="sidebar" style={S.sidebar}>
        <div className="logo-area" style={S.logo}><div style={S.logoIcon}>{"\u2713"}</div><div><div style={S.logoText}>PraxisCheck</div><div style={S.logoSub}>{userName || 'Admin'}</div></div></div>
        <div className="nav-section" style={S.navSection}>
          {[['dashboard','\u25C9','Dashboard'],['companies','\u25C6','Betriebe'],['analyse','\u25A3','Analyse'],['export','\u2193','CSV-Export'],['settings','\u2699','Einstellungen']].filter(([k]) => { if (userRole === 'lehrer' && k === 'settings') return false; return true }).map(([k,i,l]) => (
            <button key={k} onClick={() => setView(k)} style={{ ...S.navItem, ...(view === k ? S.navActive : {}) }}><span style={S.navIcon}>{i}</span>{l}</button>
          ))}
        </div>
        <div className="divider-line" style={S.divider} />
        <div className="stats-info" style={{ padding: '0 20px', fontSize: 12, color: T.textDim }}>{companies.length} Betriebe {"\u00B7"} {checkins.length} Check-ins</div>
        <div className="legend" style={{ marginTop: 'auto', padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.8 }}>
            <span style={{ display:'inline-block',width:10,height:10,borderRadius:3,background:T.success,marginRight:6,verticalAlign:'middle' }}/>NFC {"\u2713"}
            <span style={{ display:'inline-block',width:10,height:10,borderRadius:3,background:T.warning,marginRight:6,marginLeft:10,verticalAlign:'middle' }}/>QR
            <span style={{ display:'inline-block',width:10,height:10,borderRadius:3,background:T.danger,marginRight:6,marginLeft:10,verticalAlign:'middle' }}/>Fehlt
          </div>
          <button onClick={logout} style={{ ...S.btnSmall, width: '100%', marginTop: 12, color: T.danger }}>Abmelden</button>
        </div>
      </nav>
      <main className="main-content" style={S.main}>
        {userRole === 'admin' && (<div style={{ display:'flex',gap:8,marginBottom:20,flexWrap:'wrap',alignItems:'center' }}><span style={{ fontSize:12,color:T.textDim }}>Klasse:</span><button onClick={() => setClassFilter('')} style={{ ...S.filterBtn, ...(classFilter === '' ? S.filterActive : {}) }}>Alle</button>{CLASSES.map(c => <button key={c} onClick={() => setClassFilter(c)} style={{ ...S.filterBtn, ...(classFilter === c ? S.filterActive : {}) }}>{c}</button>)}</div>)}
        {userRole === 'lehrer' && (<div style={{ display:'flex',gap:8,marginBottom:20,alignItems:'center' }}><span style={{ fontSize:12,color:T.textDim }}>Klasse:</span><span style={{ ...S.filterBtn, ...S.filterActive, cursor:'default' }}>{userKlasse}</span></div>)}
        {view === 'dashboard' && <Dashboard {...{ companies: showArchived ? filtered : activeCompanies, allCompanies: companies, checkins, schoolDays, manualCheckin, deleteCheckin, refresh }} />}
        {view === 'companies' && <Companies {...{ companies: (userRole === 'lehrer' ? companies.filter(c => c.klasse === userKlasse) : companies).slice().sort((a, b) => a.name.localeCompare(b.name, 'de')), apiCompanies, showToast, userRole, userKlasse }} />}
        {view === 'export' && <ExportView {...{ companies: showArchived ? filtered : activeCompanies, checkins, schoolDays }} />}
        {view === 'analyse' && <AnalyseView {...{ companies, checkins, schoolDays }} />}
        {view === 'settings' && <Settings {...{ schoolDays, setSchoolDays, resetData, companies }} />}
        {archivedCompanies.length > 0 && (view === 'dashboard' || view === 'export') && (<div style={{ marginTop: 8 }}><button style={{ ...S.btnSmall, color: showArchived ? T.accent : T.textDim }} onClick={() => setShowArchived(!showArchived)}>{showArchived ? `Archiv ausblenden (${archivedCompanies.length})` : `Archiv anzeigen (${archivedCompanies.length})`}</button></div>)}
      </main>
    </div>
  )
}

function Dashboard({ companies, allCompanies, checkins, schoolDays, manualCheckin, deleteCheckin, refresh }) {
  const [expandedCompany, setExpandedCompany] = useState(null)
  const [showHiddenDays, setShowHiddenDays] = useState(false)
  const [reportCompany, setReportCompany] = useState(null)
  const [reportRange, setReportRange] = useState('this_week')
  const [reportLoading, setReportLoading] = useState(false)
  const scrollRef = React.useRef(null)
  const todayRef = React.useRef(null)
  const todayStr = new Date().toISOString().split('T')[0]
  const hiddenDays = [...schoolDays, 0, 6]

  // Generate all dates from PROJECT_START to end of current week + 1
  const allDates = []
  const startD = new Date(PROJECT_START + 'T12:00:00')
  const endD = new Date(getMonday(new Date()))
  endD.setDate(endD.getDate() + 13)
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    allDates.push(ds)
  }

  const visibleDates = showHiddenDays ? allDates : allDates.filter(d => { const day = new Date(d + 'T12:00:00').getDay(); return !hiddenDays.includes(day) })

  // Week labels for header row
  const weekHeaders = []
  let lastKW = ''
  visibleDates.forEach((d, i) => {
    const m = getMonday(new Date(d + 'T12:00:00'))
    const kw = getWeekLabel(m)
    if (kw !== lastKW) {
      let span = 0
      for (let j = i; j < visibleDates.length; j++) {
        const m2 = getMonday(new Date(visibleDates[j] + 'T12:00:00'))
        if (getWeekLabel(m2) === kw) span++; else break
      }
      const mondayStr = m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0') + '-' + String(m.getDate()).padStart(2, '0')
      const isHoliday = isHolidayWeek(mondayStr, visibleDates[Math.min(i + 6, visibleDates.length - 1)])
      weekHeaders.push({ kw, span, idx: i, holiday: isHoliday ? getHolidayName(mondayStr) : null })
      lastKW = kw
    }
  })

  const todayCI = checkins.filter(c => c.date === todayStr)
  const todayCompanyIds = new Set(todayCI.map(c => c.companyId))
  const checkedIn = companies.filter(c => todayCompanyIds.has(c.id)).length
  const nfcCount = todayCI.filter(c => c.nfcVerified && companies.some(co => co.id === c.companyId)).length
  const qrCount = todayCI.filter(c => !c.nfcVerified && companies.some(co => co.id === c.companyId)).length

  const scrollToToday = () => { if (todayRef.current) todayRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }) }
  const scrollWeek = (dir) => { if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 400, behavior: 'smooth' }) }

  React.useEffect(() => { const t = setTimeout(scrollToToday, 300); return () => clearTimeout(t) }, [])

  // For report: determine which week is currently most visible
  const getVisibleMonday = () => {
    if (!scrollRef.current) return getMonday(new Date())
    const box = scrollRef.current
    const center = box.scrollLeft + box.clientWidth / 2
    const cols = box.querySelectorAll('[data-date]')
    let closest = null, closestDist = Infinity
    cols.forEach(col => { const dist = Math.abs(col.offsetLeft - center); if (dist < closestDist) { closestDist = dist; closest = col.getAttribute('data-date') } })
    return closest ? getMonday(new Date(closest + 'T12:00:00')) : getMonday(new Date())
  }

  const generateReport = async () => { setReportLoading(true); let startDate, endDate; const refMonday = getVisibleMonday(); refMonday.setHours(12,0,0,0); const fmt = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const satOf = (mon) => { const s = new Date(mon); s.setDate(mon.getDate() + 5); return s }; if (reportRange === 'this_week') { startDate = fmt(refMonday); endDate = fmt(satOf(refMonday)) } else if (reportRange === 'last_week') { const lm = new Date(refMonday); lm.setDate(refMonday.getDate() - 7); startDate = fmt(lm); endDate = fmt(satOf(lm)) } else if (reportRange === '2_weeks') { const lm = new Date(refMonday); lm.setDate(refMonday.getDate() - 7); startDate = fmt(lm); endDate = fmt(satOf(refMonday)) } else if (reportRange === '4_weeks') { const lm = new Date(refMonday); lm.setDate(refMonday.getDate() - 21); startDate = fmt(lm); endDate = fmt(satOf(refMonday)) } else { startDate = PROJECT_START; endDate = fmt(satOf(refMonday)) }; try { const res = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId: reportCompany.id, startDate, endDate, schoolDays }) }); if (!res.ok) throw new Error('Report failed'); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Fehlbericht_${reportCompany.code}.docx`; a.click(); URL.revokeObjectURL(url); setReportCompany(null) } catch (e) { alert('Fehler: ' + e.message) }; setReportLoading(false) }

  const colW = 80
  const stickyStyle = (left, zIdx, bg) => ({ position: 'sticky', left, zIndex: zIdx, background: bg || T.surface })

  return (
    <div style={{ animation: 'fadeIn .3s ease' }}>
      {reportCompany && (<div style={S.modal} onClick={() => setReportCompany(null)}><div style={S.modalContent} onClick={e => e.stopPropagation()}><h3 style={{ ...S.h2, fontSize: 16, marginBottom: 4 }}>Fehlbericht erstellen</h3><p style={{ color: T.textMuted, fontSize: 13, marginBottom: 16 }}>{reportCompany.code} {"\u2013"} {reportCompany.name}</p><div style={{ marginBottom: 16 }}><label style={S.label}>Zeitraum</label><select style={S.input} value={reportRange} onChange={e => setReportRange(e.target.value)}><option value="this_week">Diese Woche</option><option value="last_week">Letzte Woche</option><option value="2_weeks">Letzte 2 Wochen</option><option value="4_weeks">Letzte 4 Wochen</option><option value="all">Gesamter Zeitraum</option></select></div><p style={{ color: T.textDim, fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>Word-Datei mit allen Praktikumstagen ohne Check-in.</p><div style={{ display: 'flex', gap: 8 }}><button style={{ ...S.btnPrimary, flex: 1, opacity: reportLoading ? 0.5 : 1 }} onClick={generateReport} disabled={reportLoading}>{reportLoading ? 'Wird erstellt...' : 'Word-Datei erstellen'}</button><button style={{ ...S.btnGhost, flex: 1 }} onClick={() => setReportCompany(null)}>Abbrechen</button></div></div></div>)}

      <div className="stats-grid" style={S.statsGrid}>
        <div className="stat-card" style={{ ...S.card, padding: 20 }}><div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Heute eingecheckt</div><div className="stat-value" style={{ fontSize: 32, fontWeight: 700, color: T.success, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>{checkedIn}/{companies.length}</div><div style={{ fontSize: 12, color: T.textDim, marginTop: 6 }}>{companies.length - checkedIn} fehlen</div></div>
        <div className="stat-card" style={{ ...S.card, padding: 20 }}><div style={{ fontSize: 11, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>NFC / QR / Fehlt</div><div className="stat-value" style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}><span style={{ color: T.success }}>{nfcCount}</span><span style={{ color: T.textDim }}> / </span><span style={{ color: T.warning }}>{qrCount}</span><span style={{ color: T.textDim }}> / </span><span style={{ color: T.danger }}>{companies.length - checkedIn}</span></div></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={S.h2}>{"\u00DC"}bersicht</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={S.btnSmall} onClick={() => setShowHiddenDays(!showHiddenDays)}>{showHiddenDays ? 'Nur Praktikumstage' : 'Alle Tage anzeigen'}</button>
          <button style={{ ...S.btnSmall, fontSize: 16, padding: '4px 12px' }} onClick={() => scrollWeek(-1)}>{"\u25C0"}</button>
          <button style={{ ...S.btnSmall, color: T.accent, borderColor: T.accent }} onClick={scrollToToday}>Heute</button>
          <button style={{ ...S.btnSmall, fontSize: 16, padding: '4px 12px' }} onClick={() => scrollWeek(1)}>{"\u25B6"}</button>
        </div>
      </div>

      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'visible', maxHeight: 'calc(100vh - 220px)' }}>
          <table style={{ ...S.table, marginBottom: 0, borderCollapse: 'separate', borderSpacing: 0 }}>
            {/* KW header row */}
            <thead>
              <tr>{/* sticky corners */}
                <th style={{ ...S.th, minWidth: 55, ...stickyStyle(0, 4, T.surface), borderRight: `1px solid ${T.border}` }}></th>
                <th style={{ ...S.th, minWidth: 120, ...stickyStyle(55, 4, T.surface), borderRight: `1px solid ${T.border}` }}></th>
                {weekHeaders.map((wh, wi) => (
                  <th key={wi} colSpan={wh.span} style={{ ...S.th, textAlign: 'center', background: wh.holiday ? T.warningDim + '33' : T.accentDim + '22', color: wh.holiday ? T.warning : T.accent, fontWeight: 600, fontSize: 11, borderBottom: `2px solid ${wh.holiday ? T.warning : T.accent}`, whiteSpace: 'nowrap' }}>
                    {wh.holiday ? `${"\uD83C\uDFD6"} ${wh.kw}` : wh.kw}
                  </th>
                ))}
                <th style={{ ...S.th, width: 30 }}></th>
              </tr>
              <tr>
                <th style={{ ...S.th, minWidth: 55, ...stickyStyle(0, 4, T.surface), borderRight: `1px solid ${T.border}` }}>K{"\u00FC"}rzel</th>
                <th style={{ ...S.th, minWidth: 120, ...stickyStyle(55, 4, T.surface), borderRight: `1px solid ${T.border}` }}>Betrieb</th>
                {visibleDates.map((d, di) => {
                  const day = new Date(d + 'T12:00:00').getDay()
                  const isToday = d === todayStr
                  const isHoliday = isInHoliday(d)
                  const isHidden = hiddenDays.includes(day)
                  const isNewWeek = di > 0 && getWeekLabel(getMonday(new Date(d + 'T12:00:00'))) !== getWeekLabel(getMonday(new Date(visibleDates[di - 1] + 'T12:00:00')))
                  return (
                    <th key={d} ref={isToday ? todayRef : null} data-date={d} style={{ ...S.th, textAlign: 'center', minWidth: colW, background: isToday ? T.accentDim + '33' : isHoliday ? T.warningDim + '22' : isHidden ? T.school : 'transparent', color: isToday ? T.accent : T.textDim, borderBottom: isToday ? `2px solid ${T.accent}` : undefined, borderLeft: isNewWeek ? `2px solid ${T.accent}44` : undefined }}>
                      {WEEKDAYS[day]} {formatDate(d)}
                    </th>
                  )
                })}
                <th style={{ ...S.th, width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {companies.map(co => {
                const isExpanded = expandedCompany === co.id
                return (
                  <React.Fragment key={co.id}>
                    <tr style={{ height: 38 }}>
                      <td style={{ ...S.td, fontWeight: 700, color: T.accent, fontFamily: "'Space Mono', monospace", cursor: 'pointer', verticalAlign: 'middle', ...stickyStyle(0, 2, T.surface), borderRight: `1px solid ${T.border}` }} onClick={() => setExpandedCompany(isExpanded ? null : co.id)}>{co.code}</td>
                      <td style={{ ...S.td, color: T.text, cursor: 'pointer', verticalAlign: 'middle', whiteSpace: 'nowrap', ...stickyStyle(55, 2, T.surface), borderRight: `1px solid ${T.border}` }} onClick={() => setExpandedCompany(isExpanded ? null : co.id)}>{co.name} <span style={{ color: T.textDim, fontSize: 10 }}>{isExpanded ? "\u25B2" : "\u25BC"}</span></td>
                      {visibleDates.map((d, di) => {
                        const day = new Date(d + 'T12:00:00').getDay()
                        const isHidden = hiddenDays.includes(day)
                        const isHoliday = isInHoliday(d)
                        const outsideRange = (co.startDate && d < co.startDate) || (co.endDate && d > co.endDate)
                        const ci = checkins.find(c => c.companyId === co.id && c.date === d)
                        const isToday = d === todayStr
                        const isNewWeek = di > 0 && getWeekLabel(getMonday(new Date(d + 'T12:00:00'))) !== getWeekLabel(getMonday(new Date(visibleDates[di - 1] + 'T12:00:00')))
                        const bgCol = isToday ? T.accentDim + '11' : isHoliday ? T.warningDim + '11' : isHidden ? T.school : 'transparent'
                        return (
                          <td key={d} data-date={d} style={{ ...S.td, textAlign: 'center', background: bgCol, cursor: outsideRange ? 'default' : 'pointer', verticalAlign: 'middle', minWidth: colW, height: 38, padding: '4px 6px', borderLeft: isNewWeek ? `2px solid ${T.accent}44` : undefined }}
                            onClick={() => { if (outsideRange) return; if (ci) deleteCheckin(co.id, d); else manualCheckin(co.id, d, true) }}
                            title={outsideRange ? 'Au\u00dferhalb Praktikumszeitraum' : ci ? (ci.time + (ci.manual ? ' (manuell)' : '') + ' \u2013 Klicken zum Entfernen') : 'Klicken f\u00fcr manuellen Eintrag'}>
                            {outsideRange ? <span style={{ color: T.textDim, fontSize: 9 }}>{"\u00B7"}</span> : ci ? (
                              <span style={{ ...S.badge, background: ci.nfcVerified ? T.successDim : T.warningDim, color: ci.nfcVerified ? T.success : T.warning, fontSize: 10, lineHeight: '16px', display: 'inline-block', height: 20, overflow: 'hidden' }}>
                                {ci.time === 'manuell' ? '\u270E' : ci.time} {ci.nfcVerified ? '\u2713' : '\u26A0'}
                              </span>
                            ) : d <= todayStr && !isHidden && !isHoliday ? (
                              <span style={{ ...S.badge, background: T.dangerDim, color: T.danger, fontSize: 10, lineHeight: '16px', display: 'inline-block', height: 20 }}>{"\u2717"}</span>
                            ) : <span style={{ color: T.textDim, fontSize: 10 }}>{"\u2013"}</span>}
                          </td>
                        )
                      })}
                      <td style={{ ...S.td, textAlign: 'center', verticalAlign: 'middle' }}><button onClick={(e) => { e.stopPropagation(); setReportCompany(co) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0, color: T.textDim }} title="Fehlbericht">{"\uD83D\uDCCB"}</button></td>
                    </tr>
                    {isExpanded && (<tr><td colSpan={visibleDates.length + 3} style={{ padding: 0 }}><CompanyStats companyId={co.id} companies={companies} checkins={checkins} schoolDays={schoolDays} /></td></tr>)}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── COMPANY STATS (NEU) ───
function CompanyStats({ companyId, companies, checkins, schoolDays }) {
  const company = companies.find(c => c.id === companyId)
  if (!company) return null
  const DEFAULT_PRACTICE = [1, 2, 5]
  const [practiceDays, setPracticeDays] = useState(DEFAULT_PRACTICE)
  const [chartMiddleDays, setChartMiddleDays] = useState(DEFAULT_PRACTICE)
  const companyStart = company.startDate || PROJECT_START
  const companyEnd = company.endDate || '2026-07-17'
  const companyCheckins = checkins.filter(c => c.companyId === companyId && c.date >= companyStart && c.date <= companyEnd).sort((a, b) => b.date.localeCompare(a.date))
  const total = companyCheckins.length
  const todayStr = new Date().toISOString().split('T')[0]
  let totalPracticeDays = 0, attendedPracticeDays = 0
  const startDate = new Date(companyStart + 'T12:00:00')
  const effectiveEnd = companyEnd < todayStr ? companyEnd : todayStr
  for (let d = new Date(startDate); ; d.setDate(d.getDate() + 1)) { const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (ds > effectiveEnd) break; if (isInHoliday(ds)) continue; if (practiceDays.includes(d.getDay())) { totalPracticeDays++; if (companyCheckins.some(c => c.date === ds)) attendedPracticeDays++ } }
  const missedDays = totalPracticeDays - attendedPracticeDays
  const attendancePercent = totalPracticeDays > 0 ? Math.round((attendedPracticeDays / totalPracticeDays) * 100) : 0
  const pieData = [{ name: 'Anwesend', value: attendedPracticeDays }, { name: 'Gefehlt', value: missedDays }].filter(d => d.value > 0)
  const dayStats = chartMiddleDays.map(day => ({ name: WEEKDAYS[day], anwesend: companyCheckins.filter(c => new Date(c.date + 'T12:00:00').getDay() === day).length }))
  const weekCounts = []; const now = new Date(); for (let i = 7; i >= 0; i--) { const m = getMonday(new Date(now.getTime() - i * 7 * 86400000)); const dates = getWeekDatesFromMonday(m); const count = companyCheckins.filter(c => dates.includes(c.date)).length; if (count > 0 || i <= 3) weekCounts.push({ name: getWeekLabel(m), tage: count }) }
  const dayToggle = (days, setDays, day) => { setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()) }
  const dayBtnStyle = (days, day) => ({ padding: '2px 6px', borderRadius: 4, fontSize: 9, cursor: 'pointer', border: 'none', background: days.includes(day) ? T.accentDim + '66' : T.surfaceLight, color: days.includes(day) ? T.accent : T.textDim, fontFamily: "'DM Sans', sans-serif" })

  return (
    <div style={{ ...S.card, animation: 'fadeIn .3s ease', marginTop: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: T.accent }}>{company.code} {"\u00B7"} {company.name}</h3>
        <span style={{ fontSize: 12, color: T.textDim }}>{total} Check-ins gesamt {"\u00B7"} {company.klasse || '\u2013'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
        <div style={{ background: T.surfaceLight, borderRadius: 10, padding: 16 }}>
          <h4 style={{ fontSize: 12, color: T.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>Anwesenheitsquote</h4>
          {totalPracticeDays > 0 ? (<><ResponsiveContainer width="100%" height={140}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" label={({ name, value }) => `${name}: ${value}`}><Cell fill={T.success} /><Cell fill={T.danger} /></Pie><Tooltip /></PieChart></ResponsiveContainer><div style={{ textAlign: 'center', marginTop: 4 }}><span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: attendancePercent >= 80 ? T.success : attendancePercent >= 50 ? T.warning : T.danger }}>{attendancePercent}%</span><span style={{ fontSize: 11, color: T.textDim, marginLeft: 8 }}>{attendedPracticeDays}/{totalPracticeDays} Tage</span></div></>) : <p style={{ color: T.textDim, fontSize: 13 }}>Keine Daten</p>}
          <div style={{ display: 'flex', gap: 3, marginTop: 8, flexWrap: 'wrap' }}><span style={{ fontSize: 9, color: T.textDim, marginRight: 4 }}>Praktikumstage:</span>{[['Mo',1],['Di',2],['Mi',3],['Do',4],['Fr',5],['Sa',6]].map(([l,d]) => (<button key={d} style={dayBtnStyle(practiceDays, d)} onClick={() => dayToggle(practiceDays, setPracticeDays, d)}>{l}</button>))}</div>
        </div>
        <div style={{ background: T.surfaceLight, borderRadius: 10, padding: 16 }}>
          <h4 style={{ fontSize: 12, color: T.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>Anwesenheit pro Wochentag</h4>
          <ResponsiveContainer width="100%" height={160}><BarChart data={dayStats}><XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 11 }} /><YAxis tick={{ fill: T.textDim, fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} /><Bar dataKey="anwesend" fill={T.accent} radius={[4, 4, 0, 0]} name="Anwesend" /></BarChart></ResponsiveContainer>
          <div style={{ display: 'flex', gap: 3, marginTop: 8, flexWrap: 'wrap' }}><span style={{ fontSize: 9, color: T.textDim, marginRight: 4 }}>Tage:</span>{[['Mo',1],['Di',2],['Mi',3],['Do',4],['Fr',5],['Sa',6]].map(([l,d]) => (<button key={d} style={dayBtnStyle(chartMiddleDays, d)} onClick={() => dayToggle(chartMiddleDays, setChartMiddleDays, d)}>{l}</button>))}</div>
        </div>
        <div style={{ background: T.surfaceLight, borderRadius: 10, padding: 16 }}>
          <h4 style={{ fontSize: 12, color: T.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>Check-ins pro Kalenderwoche</h4>
          <ResponsiveContainer width="100%" height={160}><BarChart data={weekCounts}><XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 10 }} /><YAxis tick={{ fill: T.textDim, fontSize: 11 }} allowDecimals={false} domain={[0, (max) => Math.max(max, 3)]} /><Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} /><Bar dataKey="tage" fill={T.success} radius={[4, 4, 0, 0]} name="Check-ins" /></BarChart></ResponsiveContainer>
          <div style={{ fontSize: 9, color: T.textDim, marginTop: 4 }}>Alle Tage (Mo{"\u2013"}So) der jeweiligen KW</div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}><h4 style={{ fontSize: 12, color: T.textMuted, marginBottom: 8, textTransform: 'uppercase' }}>Alle Check-ins</h4><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{companyCheckins.slice(0, 30).map(ci => (<span key={ci.id} style={{ ...S.badge, background: ci.nfcVerified ? T.successDim : T.warningDim, color: ci.nfcVerified ? T.success : T.warning, fontSize: 11 }}>{ci.date.split('-').reverse().join('.')} {ci.time}{ci.manual ? ' \u270E' : ''} {ci.nfcVerified ? '\u2713' : '\u26A0'}</span>))}{companyCheckins.length > 30 && <span style={{ fontSize: 11, color: T.textDim }}>+{companyCheckins.length - 30} weitere</span>}</div></div>
    </div>
  )
}

function Companies({ companies, apiCompanies, showToast, userRole, userKlasse }) {
  const [showForm, setShowForm] = useState(false)
  const todayDate = () => { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0') }
  const [form, setForm] = useState({ name: '', code: '', klasse: userKlasse || '', startDate: todayDate(), endDate: '2026-07-17' })
  const [editId, setEditId] = useState(null)
  const [showQR, setShowQR] = useState(null)
  const [klasseFilter, setKlasseFilter] = useState(userKlasse || '')
  const [statusFilter, setStatusFilter] = useState('active')
  const [trashCompany, setTrashCompany] = useState(null)
  const [trashData, setTrashData] = useState([])
  const [trashLoading, setTrashLoading] = useState(false)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const klasseSuffix = { BPA: 'A', BPB: 'B', BPD: 'D', BPE: 'E' }
  const getCodeSuffix = () => { const kl = userRole === 'lehrer' ? userKlasse : form.klasse; return klasseSuffix[kl] || '' }
  const nextCode = () => { const suffix = getCodeSuffix(); const used = companies.map(c => c.code); for (let i = 1; i < 1000; i++) { const cd = String(i).padStart(3, '0') + suffix; if (!used.includes(cd)) return cd } return '999' + suffix }
  const submit = async () => { if (!form.name.trim()) return; const code = form.code.trim() || nextCode(); const klasse = userRole === 'lehrer' ? userKlasse : form.klasse; const sd = form.startDate || todayDate(); const ed = form.endDate || '2026-07-17'; if (editId) { await apiCompanies('update', { ...form, klasse, code, startDate: sd, endDate: ed, id: editId }); showToast('Betrieb aktualisiert') } else { await apiCompanies('add', { id: Date.now().toString(), ...form, klasse, code, startDate: sd, endDate: ed }); showToast('Betrieb hinzugef\u00fcgt') }; setForm({ name: '', code: '', klasse: userKlasse || '', startDate: todayDate(), endDate: '2026-07-17' }); setShowForm(false); setEditId(null) }

  const loadTrash = async (company) => { setTrashCompany(company); setTrashLoading(true); try { const res = await fetch('/api/manual-checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId: company.id, action: 'get_trash' }) }); const data = await res.json(); setTrashData(Array.isArray(data) ? data.sort((a,b) => b.date.localeCompare(a.date)) : []) } catch { setTrashData([]) }; setTrashLoading(false) }
  const restoreItem = async (item) => { await fetch('/api/manual-checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId: item.companyId, date: item.date, action: 'restore' }) }); showToast('Wiederhergestellt'); loadTrash(trashCompany) }
  const deletePermanent = async (item) => { if (!confirm('Endg\u00fcltig l\u00f6schen?')) return; await fetch('/api/manual-checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId: item.companyId, date: item.date, action: 'delete_permanent' }) }); showToast('Endg\u00fcltig gel\u00f6scht'); loadTrash(trashCompany) }

  let filteredCompanies = companies
  if (userRole === 'admin' && klasseFilter) filteredCompanies = filteredCompanies.filter(c => c.klasse === klasseFilter)
  if (statusFilter === 'active') filteredCompanies = filteredCompanies.filter(c => !c.archived)
  else if (statusFilter === 'archived') filteredCompanies = filteredCompanies.filter(c => c.archived)

  return (
    <div style={{ animation: 'fadeIn .3s ease' }}>
      <div style={S.header}><div><h1 style={S.h1}>Betriebe{userRole === 'lehrer' ? ` \u2013 ${userKlasse}` : ''}</h1></div><button style={S.btnPrimary} onClick={() => { const kl = userKlasse || ''; const suf = klasseSuffix[kl] || ''; const used = companies.map(c => c.code); let cd = '001' + suf; for (let i = 1; i < 1000; i++) { cd = String(i).padStart(3, '0') + suf; if (!used.includes(cd)) break }; setShowForm(true); setEditId(null); setForm({ name: '', code: cd, klasse: kl, startDate: todayDate(), endDate: '2026-07-17' }) }}>+ Hinzuf&uuml;gen</button></div>

      {userRole === 'admin' && (<div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: T.textDim }}>Klasse:</span>
        <button onClick={() => setKlasseFilter('')} style={{ ...S.filterBtn, ...(klasseFilter === '' ? S.filterActive : {}) }}>Alle</button>
        {CLASSES.map(c => <button key={c} onClick={() => setKlasseFilter(c)} style={{ ...S.filterBtn, ...(klasseFilter === c ? S.filterActive : {}) }}>{c}</button>)}
        <span style={{ fontSize: 12, color: T.textDim, marginLeft: 12 }}>Status:</span>
        {[['active','Aktiv'],['archived','Archiviert'],['all','Alle']].map(([v,l]) => <button key={v} onClick={() => setStatusFilter(v)} style={{ ...S.filterBtn, ...(statusFilter === v ? S.filterActive : {}) }}>{l}</button>)}
      </div>)}

      {showForm && (<div style={{ ...S.card, borderColor: T.accent, marginBottom: 16 }}><div style={S.formGrid}><div><label style={S.label}>Betriebsname *</label><input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Netto Kleve" /></div><div><label style={S.label}>K&uuml;rzel</label><input style={S.input} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>{userRole === 'admin' && (<div><label style={S.label}>Klasse</label><select style={S.input} value={form.klasse} onChange={e => setForm({ ...form, klasse: e.target.value })}><option value="">{"\u2013"} Klasse w&auml;hlen {"\u2013"}</option>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>)}{userRole === 'lehrer' && (<div><label style={S.label}>Klasse</label><input style={S.input} value={userKlasse} disabled /></div>)}<div><label style={S.label}>Startdatum</label><input type="date" style={S.input} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div><div><label style={S.label}>Enddatum</label><input type="date" style={S.input} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div></div><div style={{ display: 'flex', gap: 8, marginTop: 14 }}><button style={S.btnPrimary} onClick={submit}>{editId ? 'Speichern' : 'Hinzuf\u00fcgen'}</button><button style={S.btnGhost} onClick={() => { setShowForm(false); setEditId(null) }}>Abbrechen</button></div></div>)}

      {showQR && (<div style={S.modal} onClick={() => setShowQR(null)}><div style={S.modalContent} onClick={e => e.stopPropagation()}><h3 style={{ ...S.h2, textAlign: 'center', marginBottom: 4 }}>{showQR.name}</h3><p style={{ textAlign: 'center', fontFamily: "'Space Mono', monospace", color: T.accent, fontSize: 20, marginBottom: 16 }}>{showQR.code}</p><div style={{ textAlign: 'center', background: '#fff', borderRadius: 12, padding: 20, marginBottom: 12 }}><img src={qrUrl(`${baseUrl}/c/${showQR.code}`, 220)} alt="QR" style={{ width: 220, height: 220 }} /></div><div style={{ background: T.surfaceLight, borderRadius: 8, padding: 10, fontSize: 11, color: T.textMuted, marginBottom: 12 }}><div><strong style={{ color: T.text }}>QR:</strong> <code style={{ color: T.warning }}>{baseUrl}/c/{showQR.code}</code></div><div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}><strong style={{ color: T.text }}>NFC:</strong> <code style={{ color: T.success, flex: 1 }}>{baseUrl}/n/{showQR.code}</code><button style={{ padding: '2px 8px', background: T.successDim, color: T.success, border: `1px solid ${T.success}66`, borderRadius: 4, fontSize: 10, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }} title="NFC-URL kopieren" onClick={async () => { try { await navigator.clipboard.writeText(`${baseUrl}/n/${showQR.code}`); showToast('NFC-URL kopiert') } catch { alert('Kopieren fehlgeschlagen') } }}>{"\uD83D\uDCCB Kopieren"}</button></div><div style={{ marginTop: 8, borderTop: `1px solid ${T.border}`, paddingTop: 8, color: T.textDim }}>NFC-Tag mit "NFC Tools" {"\u2192"} Schreiben {"\u2192"} URL {"\u2192"} die gr&uuml;ne URL eintragen</div></div><div style={{ display: 'flex', gap: 8 }}><button style={{ ...S.btnPrimary, flex: 1 }} onClick={() => { window.location.href = `/api/export?code=${showQR.code}&name=${encodeURIComponent(showQR.name)}&baseUrl=${encodeURIComponent(baseUrl)}` }}>{"\uD83D\uDCC4"} Check-in Download</button><button style={{ ...S.btnGhost, flex: 1 }} onClick={() => setShowQR(null)}>Schlie&szlig;en</button></div></div></div>)}

      {trashCompany && (<div style={S.modal} onClick={() => setTrashCompany(null)}><div style={{ ...S.modalContent, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ ...S.h2, fontSize: 16, marginBottom: 4 }}>Entfernte Check-ins</h3>
        <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 16 }}>{trashCompany.code} {"\u2013"} {trashCompany.name}</p>
        {trashLoading ? <p style={{ color: T.textDim, fontSize: 13 }}>Lade...</p> : trashData.length === 0 ? <p style={{ color: T.textDim, fontSize: 13 }}>Keine entfernten Check-ins vorhanden.</p> : (
          <div style={{ maxHeight: 350, overflowY: 'auto' }}>{trashData.map(item => (
            <div key={item.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}22`, gap: 8 }}>
              <div><span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: T.text }}>{item.date.split('-').reverse().join('.')}</span><span style={{ fontSize: 11, color: T.textDim, marginLeft: 8 }}>{item.time} {item.nfcVerified ? '\u2713 NFC' : '\u26A0 QR'}</span><span style={{ fontSize: 10, color: T.textDim, marginLeft: 8 }}>gel\u00f6scht: {item.deletedAtTime || '\u2013'}</span></div>
              <div style={{ display: 'flex', gap: 4 }}><button style={{ ...S.btnSmall, color: T.success, fontSize: 10 }} onClick={() => restoreItem(item)}>{"\u21A9"} Wiederherstellen</button><button style={{ ...S.btnSmall, color: T.danger, fontSize: 10 }} onClick={() => deletePermanent(item)}>{"\u2717"}</button></div>
            </div>))}</div>
        )}
        <div style={{ marginTop: 16 }}><button style={{ ...S.btnGhost, width: '100%' }} onClick={() => setTrashCompany(null)}>Schlie&szlig;en</button></div>
      </div></div>)}

      {filteredCompanies.length === 0 ? <div style={S.card}><Empty text="Keine Betriebe gefunden." /></div> : (<div style={{ display: 'grid', gap: 10 }}>{filteredCompanies.map(c => (<div key={c.id} style={{ ...S.card, padding: 16, opacity: c.archived ? 0.5 : 1 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: T.accent }}>{c.code}</span><span style={{ color: T.text, fontSize: 15 }}>{c.name}</span>{c.klasse && <span style={{ ...S.badge, background: T.surfaceLight, color: T.textMuted, fontSize: 11 }}>{c.klasse}</span>}{c.startDate && <span style={{ fontSize: 10, color: T.textDim }}>{c.startDate.split('-').reverse().slice(0,2).join('.')}{"\u2013"}{(c.endDate || '17.07.').split('-').reverse().slice(0,2).join('.')}</span>}{c.archived && <span style={{ ...S.badge, background: T.dangerDim, color: T.danger, fontSize: 10 }}>Archiviert</span>}</div><div style={{ display: 'flex', gap: 6 }}><button style={S.btnSmall} onClick={() => setShowQR(c)}>QR</button><button style={{ ...S.btnSmall, fontSize: 10 }} onClick={() => loadTrash(c)} title="Entfernte Check-ins">{"\uD83D\uDDD1"}</button><button style={S.btnSmall} onClick={() => { setForm({ name: c.name, code: c.code, klasse: c.klasse || '', startDate: c.startDate || '2026-04-13', endDate: c.endDate || '2026-07-17' }); setEditId(c.id); setShowForm(true) }}>{"\u270E"}</button><button style={{ ...S.btnSmall, color: c.archived ? T.success : T.warning }} onClick={async () => { await apiCompanies('update', { ...c, archived: !c.archived }); showToast(c.archived ? 'Betrieb wiederhergestellt' : 'Betrieb archiviert') }}>{c.archived ? '\u21A9' : '\uD83D\uDCE6'}</button><button style={{ ...S.btnSmall, color: T.danger }} onClick={async () => { if (!confirm(`Betrieb "${c.name}" wirklich l\u00f6schen?`)) return; const pw = prompt('Admin-Passwort eingeben:'); if (!pw) return; const authRes = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: pw }) }); const authData = await authRes.json(); if (!authData.ok) { alert('Falsches Passwort!'); return }; await apiCompanies('delete', null, c.id); showToast('Gel\u00f6scht') }}>{"\u2717"}</button></div></div></div>))}</div>)}
    </div>
  )
}

// ─── ANALYSE ───
function AnalyseView({ companies, checkins, schoolDays }) {
  const [klasseFilter, setKlasseFilter] = useState('')
  const todayStr = new Date().toISOString().split('T')[0]
  const practiceDayNums = [1,2,3,4,5].filter(d => !schoolDays.includes(d))
  const activeCompanies = companies.filter(c => !c.archived)

  function getCompanyStats(co) {
    const sd = co.startDate || PROJECT_START
    const ed = co.endDate || '2026-07-17'
    const effectiveEnd = ed < todayStr ? ed : todayStr
    const coCheckins = checkins.filter(c => c.companyId === co.id && c.date >= sd && c.date <= effectiveEnd)
    let totalDays = 0, attended = 0, nfc = 0, qrOnly = 0
    const dayCount = {}
    practiceDayNums.forEach(d => { dayCount[d] = { total: 0, attended: 0 } })
    for (let d = new Date(sd + 'T12:00:00'); ; d.setDate(d.getDate() + 1)) {
      const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
      if (ds > effectiveEnd) break
      if (isInHoliday(ds)) continue
      const wd = d.getDay()
      if (practiceDayNums.includes(wd)) {
        totalDays++
        if (dayCount[wd]) dayCount[wd].total++
        const ci = coCheckins.find(c => c.date === ds)
        if (ci) { attended++; if (dayCount[wd]) dayCount[wd].attended++; if (ci.nfcVerified) nfc++; else qrOnly++ }
      }
    }
    const pct = totalDays > 0 ? Math.round((attended / totalDays) * 100) : 0
    const missingDayPattern = Object.entries(dayCount).filter(([, v]) => v.total >= 2 && v.attended / v.total < 0.4).map(([d]) => WEEKDAYS[Number(d)])
    return { co, totalDays, attended, missed: totalDays - attended, pct, nfc, qrOnly, missingDayPattern, neverNfc: nfc === 0 && qrOnly > 0 }
  }

  const allStats = activeCompanies.map(getCompanyStats).filter(s => s.totalDays > 0)
  const filteredStats = klasseFilter ? allStats.filter(s => s.co.klasse === klasseFilter) : allStats

  // Klassen-Aggregat
  const classSummary = CLASSES.map(cls => {
    const cs = allStats.filter(s => s.co.klasse === cls)
    const total = cs.reduce((a, s) => a + s.totalDays, 0)
    const att = cs.reduce((a, s) => a + s.attended, 0)
    return { name: cls, quote: total > 0 ? Math.round((att / total) * 100) : 0, betriebe: cs.length, total, attended: att }
  }).filter(c => c.betriebe > 0)

  const gesamt = allStats.reduce((a, s) => ({ t: a.t + s.totalDays, a: a.a + s.attended, n: a.n + s.nfc, q: a.q + s.qrOnly }), { t: 0, a: 0, n: 0, q: 0 })
  const gesamtPct = gesamt.t > 0 ? Math.round((gesamt.a / gesamt.t) * 100) : 0

  // Auffälligkeiten
  const highAbsence = filteredStats.filter(s => s.pct < 70).sort((a, b) => a.pct - b.pct)
  const patternIssues = filteredStats.filter(s => s.missingDayPattern.length > 0)
  const neverNfcList = filteredStats.filter(s => s.neverNfc)

  // Trend: letzte 6 Wochen
  const weekTrend = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const m = getMonday(new Date(now.getTime() - i * 7 * 86400000))
    const dates = getWeekDatesFromMonday(m)
    const practiceDates = dates.filter(d => { const day = new Date(d + 'T12:00:00').getDay(); return practiceDayNums.includes(day) && !isInHoliday(d) })
    const relevantCompanies = activeCompanies.filter(c => { const sd = c.startDate || PROJECT_START; const ed = c.endDate || '2026-07-17'; return practiceDates.some(d => d >= sd && d <= ed) })
    const possible = relevantCompanies.length * practiceDates.length
    const actual = checkins.filter(c => practiceDates.includes(c.date) && relevantCompanies.some(co => co.id === c.companyId)).length
    weekTrend.push({ name: getWeekLabel(m), quote: possible > 0 ? Math.round((actual / possible) * 100) : 0 })
  }

  const rankSorted = [...filteredStats].sort((a, b) => a.pct - b.pct)
  const cardBg = { background: T.surfaceLight, borderRadius: 10, padding: 16 }

  return (
    <div style={{ animation: 'fadeIn .3s ease' }}>
      <h1 style={{ ...S.h1, marginBottom: 20 }}>Analyse</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: T.textDim }}>Klasse:</span>
        <button onClick={() => setKlasseFilter('')} style={{ ...S.filterBtn, ...(klasseFilter === '' ? S.filterActive : {}) }}>Alle</button>
        {CLASSES.map(c => <button key={c} onClick={() => setKlasseFilter(c)} style={{ ...S.filterBtn, ...(klasseFilter === c ? S.filterActive : {}) }}>{c}</button>)}
      </div>

      {/* Gesamt-KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
        <div style={{ ...S.card, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Gesamtquote</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: gesamtPct >= 80 ? T.success : gesamtPct >= 50 ? T.warning : T.danger }}>{gesamtPct}%</div>
        </div>
        <div style={{ ...S.card, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Betriebe</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: T.accent }}>{filteredStats.length}</div>
        </div>
        <div style={{ ...S.card, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>NFC / QR</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}><span style={{ color: T.success }}>{gesamt.n}</span><span style={{ color: T.textDim }}> / </span><span style={{ color: T.warning }}>{gesamt.q}</span></div>
        </div>
        <div style={{ ...S.card, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Auff&auml;llig</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: highAbsence.length > 0 ? T.danger : T.success }}>{highAbsence.length}</div>
        </div>
      </div>

      {/* Diagramme */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Klassenvergleich */}
        <div style={{ ...S.card }}>
          <h3 style={{ fontSize: 12, color: T.textMuted, marginBottom: 12, textTransform: 'uppercase' }}>Anwesenheitsquote nach Klasse</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={classSummary}>
              <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 11 }} />
              <YAxis tick={{ fill: T.textDim, fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} formatter={(v) => `${v}%`} />
              <Bar dataKey="quote" radius={[4, 4, 0, 0]} name="Quote">
                {classSummary.map((c, i) => <Cell key={i} fill={c.quote >= 80 ? T.success : c.quote >= 50 ? T.warning : T.danger} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Wochen-Trend */}
        <div style={{ ...S.card }}>
          <h3 style={{ fontSize: 12, color: T.textMuted, marginBottom: 12, textTransform: 'uppercase' }}>Anwesenheitstrend (letzte 6 Wochen)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekTrend}>
              <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 10 }} />
              <YAxis tick={{ fill: T.textDim, fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} formatter={(v) => `${v}%`} />
              <Bar dataKey="quote" fill={T.accent} radius={[4, 4, 0, 0]} name="Quote %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <h3 style={{ fontSize: 12, color: T.textMuted, marginBottom: 12, textTransform: 'uppercase' }}>Ranking nach Fehlquote {klasseFilter ? `\u2013 ${klasseFilter}` : '(alle Klassen)'}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>K&uuml;rzel</th><th style={S.th}>Betrieb</th><th style={S.th}>Klasse</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Quote</th><th style={{ ...S.th, textAlign: 'center' }}>Anwesend</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Gefehlt</th><th style={{ ...S.th, textAlign: 'center' }}>NFC</th><th style={{ ...S.th, textAlign: 'center' }}>QR</th>
            </tr></thead>
            <tbody>{rankSorted.map(s => (
              <tr key={s.co.id}>
                <td style={{ ...S.td, fontFamily: "'Space Mono', monospace", color: T.accent, fontWeight: 700 }}>{s.co.code}</td>
                <td style={{ ...S.td, color: T.text }}>{s.co.name}</td>
                <td style={S.td}>{s.co.klasse || '\u2013'}</td>
                <td style={{ ...S.td, textAlign: 'center', fontWeight: 700, color: s.pct >= 80 ? T.success : s.pct >= 50 ? T.warning : T.danger }}>{s.pct}%</td>
                <td style={{ ...S.td, textAlign: 'center', color: T.success }}>{s.attended}</td>
                <td style={{ ...S.td, textAlign: 'center', color: s.missed > 0 ? T.danger : T.textDim }}>{s.missed}</td>
                <td style={{ ...S.td, textAlign: 'center', color: T.success }}>{s.nfc}</td>
                <td style={{ ...S.td, textAlign: 'center', color: T.warning }}>{s.qrOnly}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* Auffälligkeiten */}
      <div style={{ ...S.card, borderColor: T.danger + '33' }}>
        <h3 style={{ fontSize: 12, color: T.danger, marginBottom: 16, textTransform: 'uppercase' }}>Auff&auml;lligkeiten</h3>

        {highAbsence.length > 0 && (<div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>{"\u26A0"} Hohe Fehlquote (&lt; 70%)</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {highAbsence.map(s => (
              <span key={s.co.id} style={{ ...S.badge, background: T.dangerDim, color: T.danger, fontSize: 11 }}>
                {s.co.code} {s.co.name} {"\u2013"} {s.pct}% ({s.missed} Tage gefehlt)
              </span>
            ))}
          </div>
        </div>)}

        {patternIssues.length > 0 && (<div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>{"\uD83D\uDCC5"} Systematische Wochentag-Muster</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {patternIssues.map(s => (
              <span key={s.co.id} style={{ ...S.badge, background: T.warningDim, color: T.warning, fontSize: 11 }}>
                {s.co.code} {s.co.name} {"\u2013"} fehlt h&auml;ufig: {s.missingDayPattern.join(', ')}
              </span>
            ))}
          </div>
        </div>)}

        {neverNfcList.length > 0 && (<div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>{"\uD83D\uDCF1"} Nie NFC genutzt (nur QR)</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {neverNfcList.map(s => (
              <span key={s.co.id} style={{ ...S.badge, background: T.surfaceLight, color: T.warning, fontSize: 11 }}>
                {s.co.code} {s.co.name} {"\u2013"} {s.qrOnly}x nur QR
              </span>
            ))}
          </div>
        </div>)}

        {highAbsence.length === 0 && patternIssues.length === 0 && neverNfcList.length === 0 && (
          <p style={{ color: T.textDim, fontSize: 13 }}>{"\u2713"} Keine Auff&auml;lligkeiten erkannt.</p>
        )}
      </div>
    </div>
  )
}

function ExportView({ companies, checkins, schoolDays }) {
  const [weeksBack, setWeeksBack] = useState(1); const now = new Date(); const todayStr = now.toISOString().split('T')[0]; const allDates = []; for (let i = weeksBack - 1; i >= 0; i--) { const m = getMonday(new Date(now.getTime() - i * 7 * 86400000)); getWeekDatesFromMonday(m).forEach(d => { const day = new Date(d).getDay(); if (day !== 0) allDates.push(d) }) }
  const downloadCSV = () => { const header = ['K\u00fcrzel', 'Betrieb', 'Klasse', ...allDates.map(d => `${WEEKDAYS[new Date(d).getDay()]} ${d}`)]; const rows = companies.map(co => { const cols = allDates.map(d => { const day = new Date(d).getDay(); const isSchool = schoolDays.includes(day); const ci = checkins.find(c => c.companyId === co.id && c.date === d); if (ci) return ci.nfcVerified ? `${ci.time} NFC` : `${ci.time} QR`; if (isSchool) return 'Schultag'; if (day === 6) return '-'; if (d <= todayStr) return 'FEHLT'; return '-' }); return [co.code, co.name, co.klasse || '', ...cols] }); const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n'); const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `PraxisCheck_Export.csv`; a.click(); URL.revokeObjectURL(url) }
  return (<div style={{ animation: 'fadeIn .3s ease' }}><div style={S.header}><h1 style={S.h1}>CSV-Export</h1><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ fontSize: 13, color: T.textMuted }}>Zeitraum:</span><select style={{ ...S.input, width: 'auto' }} value={weeksBack} onChange={e => setWeeksBack(Number(e.target.value))}><option value={1}>Aktuelle Woche</option><option value={2}>2 Wochen</option><option value={4}>4 Wochen</option><option value={8}>8 Wochen</option><option value={52}>Ganzes Jahr</option></select></div></div><div style={S.card}><p style={{ color: T.textMuted, fontSize: 14, marginBottom: 16 }}>Die CSV enth&auml;lt: K&uuml;rzel, Betriebsname, Klasse und f&uuml;r jeden Tag den Check-in-Status.</p><button style={S.btnPrimary} onClick={downloadCSV}>{"\u2193"} CSV herunterladen</button></div></div>)
}

function Settings({ schoolDays, setSchoolDays, resetData, companies }) {
  const toggleDay = (day) => { setSchoolDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]) }
  const [weeksOld, setWeeksOld] = useState(4)
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [klasseSel, setKlasseSel] = useState('BPA')
  const [companySel, setCompanySel] = useState('')
  const [companyFull, setCompanyFull] = useState('')
  const sortedCompanies = companies.slice().sort((a,b) => a.name.localeCompare(b.name, 'de'))
  const archivedCount = companies.filter(c => c.archived).length
  const btnRow = { ...S.btnSmall, color: T.warning, borderColor: T.warning + '44' }
  const btnDanger = { ...S.btnSmall, color: T.danger, borderColor: T.danger + '44' }
  const miniInput = { ...S.input, width: 'auto', padding: '6px 8px', fontSize: 12 }
  const sectionCard = { ...S.card, borderColor: T.warning + '33' }
  return (
    <div style={{ animation: 'fadeIn .3s ease' }}>
      <h1 style={{ ...S.h1, marginBottom: 24 }}>Einstellungen</h1>
      <div style={S.card}>
        <h2 style={S.h2}>Schultage festlegen</h2>
        <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 12 }}>An Schultagen wird kein Check-in erwartet.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['Mo',1],['Di',2],['Mi',3],['Do',4],['Fr',5],['Sa',6]].map(([label,day]) => (
            <button key={day} onClick={() => toggleDay(day)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${schoolDays.includes(day) ? T.accent : T.border}`, background: schoolDays.includes(day) ? T.accentDim + '44' : T.surfaceLight, color: schoolDays.includes(day) ? T.accent : T.textMuted, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{label} {schoolDays.includes(day) ? '\u2713' : ''}</button>
          ))}
        </div>
      </div>

      <div style={sectionCard}>
        <h2 style={{ ...S.h2, color: T.warning }}>Check-ins l&ouml;schen</h2>
        <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 16 }}>Betriebe bleiben erhalten, nur die Check-in-Daten werden entfernt.</p>

        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
          <label style={S.label}>&Auml;lter als ... Wochen</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={miniInput} value={weeksOld} onChange={e => setWeeksOld(Number(e.target.value))}>
              {[1,2,4,8,12,26,52].map(w => <option key={w} value={w}>{w} Wochen</option>)}
            </select>
            <button style={btnRow} onClick={() => resetData({ type: 'checkins_older_than', weeksOld })}>L&ouml;schen</button>
          </div>
        </div>

        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
          <label style={S.label}>Zeitraum</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" style={miniInput} value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
            <span style={{ color: T.textDim, fontSize: 12 }}>bis</span>
            <input type="date" style={miniInput} value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
            <button style={btnRow} onClick={() => { if (!rangeStart || !rangeEnd) { alert('Bitte beide Daten w\u00e4hlen'); return }; resetData({ type: 'checkins_range', startDate: rangeStart, endDate: rangeEnd }) }}>L&ouml;schen</button>
          </div>
        </div>

        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
          <label style={S.label}>Einer Klasse</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={miniInput} value={klasseSel} onChange={e => setKlasseSel(e.target.value)}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button style={btnRow} onClick={() => resetData({ type: 'checkins_klasse', klasse: klasseSel })}>L&ouml;schen</button>
          </div>
        </div>

        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
          <label style={S.label}>Eines Betriebs</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={miniInput} value={companySel} onChange={e => setCompanySel(e.target.value)}>
              <option value="">{"\u2013 Betrieb w\u00e4hlen \u2013"}</option>
              {sortedCompanies.map(c => <option key={c.id} value={c.id}>{c.code} {"\u2013"} {c.name}</option>)}
            </select>
            <button style={btnRow} onClick={() => { if (!companySel) { alert('Bitte Betrieb w\u00e4hlen'); return }; resetData({ type: 'checkins_company', companyId: companySel }) }}>L&ouml;schen</button>
          </div>
        </div>

        <div>
          <label style={S.label}>Alle Check-ins</label>
          <button style={btnRow} onClick={() => resetData({ type: 'checkins' })}>Alle Check-ins l&ouml;schen</button>
        </div>
      </div>

      <div style={{ ...S.card, borderColor: T.danger + '33' }}>
        <h2 style={{ ...S.h2, color: T.danger }}>Betriebe l&ouml;schen</h2>
        <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 16 }}>Betriebe werden inkl. aller zugeh&ouml;rigen Check-ins entfernt.</p>

        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
          <label style={S.label}>Einzelnen Betrieb komplett l&ouml;schen</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={miniInput} value={companyFull} onChange={e => setCompanyFull(e.target.value)}>
              <option value="">{"\u2013 Betrieb w\u00e4hlen \u2013"}</option>
              {sortedCompanies.map(c => <option key={c.id} value={c.id}>{c.code} {"\u2013"} {c.name}</option>)}
            </select>
            <button style={btnDanger} onClick={() => { if (!companyFull) { alert('Bitte Betrieb w\u00e4hlen'); return }; resetData({ type: 'company_full', companyId: companyFull }) }}>L&ouml;schen</button>
          </div>
        </div>

        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
          <label style={S.label}>Alle archivierten Betriebe ({archivedCount})</label>
          <button style={btnDanger} onClick={() => resetData({ type: 'archived_companies' })} disabled={archivedCount === 0}>Archivierte endg&uuml;ltig l&ouml;schen</button>
        </div>

        <div>
          <label style={S.label}>Alles zur&uuml;cksetzen</label>
          <button style={btnDanger} onClick={() => resetData({ type: 'all' })}>ALLE Daten l&ouml;schen (Betriebe + Check-ins)</button>
        </div>
      </div>
    </div>
  )
}

function Empty({ text }) { return <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textDim }}><div style={{ fontSize: 28, marginBottom: 8, opacity: .4 }}>{"\u25C7"}</div><p>{text}</p></div> }

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
