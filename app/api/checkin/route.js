import redis from '../../../lib/redis'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { companyCode, nfcVerified } = await req.json()
    const companies = await redis.get('companies') || []
    const company = companies.find(c => c.code === companyCode)

    if (!company) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const checkins = await redis.get('checkins') || []
    const todayStr = new Date().toISOString().split('T')[0]
    const existingIndex = checkins.findIndex(c => c.companyId === company.id && c.date === todayStr)

    if (existingIndex !== -1) {
      checkins[existingIndex].nfcVerified = nfcVerified
      checkins[existingIndex].lastMethod = nfcVerified ? 'nfc' : 'qr'
      checkins[existingIndex].lastTime = new Date().toTimeString().slice(0, 5)
      await redis.set('checkins', checkins)
      return NextResponse.json({ status: 'updated', checkin: checkins[existingIndex], company })
    }

    const now = new Date()
    const newCheckin = {
      id: Date.now().toString(),
      companyId: company.id,
      nfcVerified,
      timestamp: now.toISOString(),
      date: todayStr,
      time: now.toTimeString().slice(0, 5),
    }
    checkins.push(newCheckin)
    await redis.set('checkins', checkins)

    return NextResponse.json({ status: 'ok', checkin: newCheckin, company })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
