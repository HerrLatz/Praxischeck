import redis from ‘../../../lib/redis’
import { NextResponse } from ‘next/server’

function berlinTime() {
return new Date().toLocaleTimeString(‘de-DE’, { timeZone: ‘Europe/Berlin’, hour: ‘2-digit’, minute: ‘2-digit’ })
}
function berlinDate() {
const p = new Date().toLocaleDateString(‘de-DE’, { timeZone: ‘Europe/Berlin’, year: ‘numeric’, month: ‘2-digit’, day: ‘2-digit’ }).split(’.’)
return `${p[2]}-${p[1]}-${p[0]}`
}

export async function POST(req) {
try {
const { companyCode, nfcVerified } = await req.json()
const companies = await redis.get(‘companies’) || []
const company = companies.find(c => c.code === companyCode)

```
if (!company) {
  return NextResponse.json({ error: 'not_found' }, { status: 404 })
}

const checkins = await redis.get('checkins') || []
const todayStr = berlinDate()
const existingIndex = checkins.findIndex(c => c.companyId === company.id && c.date === todayStr)

if (existingIndex !== -1) {
  checkins[existingIndex].nfcVerified = nfcVerified
  checkins[existingIndex].lastMethod = nfcVerified ? 'nfc' : 'qr'
  checkins[existingIndex].lastTime = berlinTime()
  await redis.set('checkins', checkins)
  return NextResponse.json({ status: 'updated', checkin: checkins[existingIndex], company })
}

const newCheckin = {
  id: Date.now().toString(),
  companyId: company.id,
  nfcVerified,
  timestamp: new Date().toISOString(),
  date: todayStr,
  time: berlinTime(),
}
checkins.push(newCheckin)
await redis.set('checkins', checkins)

return NextResponse.json({ status: 'ok', checkin: newCheckin, company })
```

} catch (e) {
return NextResponse.json({ error: e.message }, { status: 500 })
}
}
