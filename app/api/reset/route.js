import redis from '../../../lib/redis'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { type, klasse, companyId, weeksOld, startDate, endDate } = await req.json()
    const checkins = await redis.get('checkins') || []
    const companies = await redis.get('companies') || []

    if (type === 'checkins') {
      await redis.set('checkins', [])
      return NextResponse.json({ status: 'ok', deleted: checkins.length })
    }

    if (type === 'all') {
      await redis.set('checkins', [])
      await redis.set('companies', [])
      return NextResponse.json({ status: 'ok' })
    }

    if (type === 'checkins_older_than') {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - (weeksOld * 7))
      const cutoffStr = cutoff.toISOString().split('T')[0]
      const kept = checkins.filter(c => c.date >= cutoffStr)
      await redis.set('checkins', kept)
      return NextResponse.json({ status: 'ok', deleted: checkins.length - kept.length })
    }

    if (type === 'checkins_klasse_older_than') {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - (weeksOld * 7))
      const cutoffStr = cutoff.toISOString().split('T')[0]
      const klasseCompanyIds = new Set(companies.filter(c => c.klasse === klasse).map(c => c.id))
      const kept = checkins.filter(c => !(klasseCompanyIds.has(c.companyId) && c.date < cutoffStr))
      await redis.set('checkins', kept)
      return NextResponse.json({ status: 'ok', deleted: checkins.length - kept.length })
    }

    if (type === 'checkins_range') {
      const kept = checkins.filter(c => c.date < startDate || c.date > endDate)
      await redis.set('checkins', kept)
      return NextResponse.json({ status: 'ok', deleted: checkins.length - kept.length })
    }

    if (type === 'checkins_klasse_range') {
      const klasseCompanyIds = new Set(companies.filter(c => c.klasse === klasse).map(c => c.id))
      const kept = checkins.filter(c => !(klasseCompanyIds.has(c.companyId) && c.date >= startDate && c.date <= endDate))
      await redis.set('checkins', kept)
      return NextResponse.json({ status: 'ok', deleted: checkins.length - kept.length })
    }

    if (type === 'checkins_klasse') {
      const companyIds = new Set(companies.filter(c => c.klasse === klasse).map(c => c.id))
      const kept = checkins.filter(c => !companyIds.has(c.companyId))
      await redis.set('checkins', kept)
      return NextResponse.json({ status: 'ok', deleted: checkins.length - kept.length })
    }

    if (type === 'checkins_company') {
      const kept = checkins.filter(c => c.companyId !== companyId)
      await redis.set('checkins', kept)
      return NextResponse.json({ status: 'ok', deleted: checkins.length - kept.length })
    }

    if (type === 'company_full') {
      const keptCheckins = checkins.filter(c => c.companyId !== companyId)
      const keptCompanies = companies.filter(c => c.id !== companyId)
      await redis.set('checkins', keptCheckins)
      await redis.set('companies', keptCompanies)
      return NextResponse.json({ status: 'ok', deleted: checkins.length - keptCheckins.length })
    }

    if (type === 'archived_companies') {
      const archivedIds = new Set(companies.filter(c => c.archived).map(c => c.id))
      const keptCompanies = companies.filter(c => !c.archived)
      const keptCheckins = checkins.filter(c => !archivedIds.has(c.companyId))
      await redis.set('companies', keptCompanies)
      await redis.set('checkins', keptCheckins)
      return NextResponse.json({ status: 'ok', deletedCompanies: archivedIds.size, deletedCheckins: checkins.length - keptCheckins.length })
    }

    if (type === 'archived_companies_klasse') {
      const archivedIds = new Set(companies.filter(c => c.archived && c.klasse === klasse).map(c => c.id))
      const keptCompanies = companies.filter(c => !(c.archived && c.klasse === klasse))
      const keptCheckins = checkins.filter(c => !archivedIds.has(c.companyId))
      await redis.set('companies', keptCompanies)
      await redis.set('checkins', keptCheckins)
      return NextResponse.json({ status: 'ok', deletedCompanies: archivedIds.size, deletedCheckins: checkins.length - keptCheckins.length })
    }

    return NextResponse.json({ error: 'invalid type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
