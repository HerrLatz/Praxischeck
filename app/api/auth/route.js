import { NextResponse } from 'next/server'
import { USERS } from '../../../lib/auth'

export async function POST(req) {
  const { username, password } = await req.json()
  const user = USERS.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password)
  if (user) {
    return NextResponse.json({
      ok: true,
      token: Buffer.from(`${user.username}:${user.password}`).toString('base64'),
      role: user.role,
      klasse: user.klasse,
      username: user.username,
    })
  }
  return NextResponse.json({ ok: false }, { status: 401 })
}
