import redis from '../../../lib/redis'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { companyId, date, nfcVerified } = await req.json()
    const checkins = await redis.get('checkins') || []
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
