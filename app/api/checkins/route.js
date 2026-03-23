import redis from '../../../lib/redis'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const checkins = await redis.get('checkins') || []
    return NextResponse.json(checkins)
  } catch (e) {
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const checkins = await redis.get('checkins') || []
    checkins.push(body)
    await redis.set('checkins', checkins)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
