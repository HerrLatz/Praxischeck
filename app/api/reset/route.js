import redis from '../../../lib/redis'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { type } = await req.json()
    if (type === 'checkins') {
      await redis.set('checkins', [])
      return NextResponse.json({ status: 'checkins_cleared' })
    }
    if (type === 'all') {
      await redis.set('checkins', [])
      await redis.set('companies', [])
      return NextResponse.json({ status: 'all_cleared' })
    }
    return NextResponse.json({ error: 'invalid type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
