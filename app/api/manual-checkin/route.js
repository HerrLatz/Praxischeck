import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

function berlinTime() {
  return new Date().toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })
}

export async function POST(req) {
  try {
    const { companyId, date, nfcVerified, action } = await req.json()
    const checkins = await redis.get('checkins') || []

    if (action === 'delete') {
      const deleted = checkins.find(c => c.companyId === companyId && c.date === date)
      const filtered = checkins.filter(c => !(c.companyId === companyId && c.date === date))
      await redis.set('checkins', filtered)
      if (deleted) {
        const trash = await redis.get('checkins_trash') || []
        trash.push({ ...deleted, deletedAt: new Date().toISOString(), deletedAtTime: berlinTime() })
        await redis.set('checkins_trash', trash)
      }
      return NextResponse.json({ status: 'deleted' })
    }

    if (action === 'restore') {
      const trash = await redis.get('checkins_trash') || []
      const item = trash.find(c => c.companyId === companyId && c.date === date)
      if (item) {
        const { deletedAt, deletedAtTime, ...restored } = item
        checkins.push(restored)
        await redis.set('checkins', checkins)
        const newTrash = trash.filter(c => !(c.companyId === companyId && c.date === date))
        await redis.set('checkins_trash', newTrash)
        return NextResponse.json({ status: 'restored' })
      }
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    if (action === 'delete_permanent') {
      const trash = await redis.get('checkins_trash') || []
      const newTrash = trash.filter(c => !(c.companyId === companyId && c.date === date))
      await redis.set('checkins_trash', newTrash)
      return NextResponse.json({ status: 'permanently_deleted' })
    }

    if (action === 'get_trash') {
      const trash = await redis.get('checkins_trash') || []
      const companyTrash = companyId ? trash.filter(c => c.companyId === companyId) : trash
      return NextResponse.json(companyTrash)
    }

    const existingIndex = checkins.findIndex(c => c.companyId === companyId && c.date === date)
    if (existingIndex !== -1) {
      checkins[existingIndex].nfcVerified = nfcVerified
      checkins[existingIndex].manual = true
      checkins[existingIndex].lastTime = berlinTime()
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
