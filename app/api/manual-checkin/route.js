import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

export async function POST(req) {
  try {
    const { companyId, date, nfcVerified, action } = await req.json()
    const checkins = await redis.get('checkins') || []

    if (action === 'delete') {
      const filtered = checkins.filter(c => !(c.companyId === companyId && c.date === date))
      await redis.set('checkins', filtered)
      return NextResponse.json({ status: 'deleted' })
    }

    const existingIndex = checkins.findIndex(c => c.companyId === companyId && c.date === date)

    if (existingIndex !== -1) {
      checkins[existingIndex].nfcVerified = nfcVerified
      checkins[existingIndex].manual = true
      checkins[existingIndex].lastTime = new Date().toTimeString().slice(0, 5)
      await redis.set('checkins', checkins)
      return NextResponse.json({ status: 'updated' })
    }

    const newCheckin = {
      id: Date.now().toString(),
      companyId,
      nfcVerified,
      manual: true,
      timestamp: new Date().toISOString(),
      date,
      time: 'manuell',
    }
    checkins.push(newCheckin)
    await redis.set('checkins', checkins)
    return NextResponse.json({ status: 'ok' })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
