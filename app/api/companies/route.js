import redis from '../../../lib/redis'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const companies = await redis.get('companies') || []
    return NextResponse.json(companies)
  } catch (e) {
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action, company, id } = body
    let companies = await redis.get('companies') || []

    if (action === 'add') {
      companies.push(company)
    } else if (action === 'update') {
      companies = companies.map(c => c.id === company.id ? company : c)
    } else if (action === 'delete') {
      companies = companies.filter(c => c.id !== id)
    }

    await redis.set('companies', companies)
    return NextResponse.json(companies)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
