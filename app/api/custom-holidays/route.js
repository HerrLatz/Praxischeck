import redis from '../../../lib/redis'
import { NextResponse } from 'next/server'

// Speicherformat in Redis-Key 'custom_holidays':
// { "ALL": ["2026-05-15", ...], "BPA": ["2026-06-02", ...], ... }
// "ALL" = gilt für alle Klassen, sonst klassenspezifisch.

export async function GET() {
  try {
    const data = await redis.get('custom_holidays') || {}
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({}, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { action, scope, date } = await req.json()
    // scope = 'ALL' oder Klassenname (z.B. 'BPB')
    if (!scope || !date) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 })
    }
    const data = await redis.get('custom_holidays') || {}
    const list = Array.isArray(data[scope]) ? data[scope] : []

    if (action === 'add') {
      if (!list.includes(date)) list.push(date)
      data[scope] = list
    } else if (action === 'remove') {
      data[scope] = list.filter(d => d !== date)
      if (data[scope].length === 0) delete data[scope]
    } else {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }

    await redis.set('custom_holidays', data)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
