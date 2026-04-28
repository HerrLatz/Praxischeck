import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

const DEFAULTS = {
  BPA: [1, 2],
  BPB: [2, 3],
  BPC: [3, 4],
  BPD: [4, 5],
  BPE: [1, 5],
}

export async function GET() {
  try {
    const settings = await redis.get('class_school_days') || DEFAULTS
    return NextResponse.json(settings)
  } catch (e) {
    return NextResponse.json(DEFAULTS)
  }
}

export async function POST(req) {
  try {
    const { klasse, schoolDays } = await req.json()
    if (!klasse || !Array.isArray(schoolDays)) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 })
    }
    const settings = await redis.get('class_school_days') || DEFAULTS
    settings[klasse] = schoolDays
    await redis.set('class_school_days', settings)
    return NextResponse.json(settings)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
