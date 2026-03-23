import { NextResponse } from 'next/server'
import { ADMIN_USER, ADMIN_PASS } from '../../../lib/auth'

export async function POST(req) {
  const { username, password } = await req.json()
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return NextResponse.json({ ok: true, token: Buffer.from(`${username}:${password}`).toString('base64') })
  }
  return NextResponse.json({ ok: false }, { status: 401 })
}
