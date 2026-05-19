import redis from '../../../lib/redis'
import { NextResponse } from 'next/server'

// Alle Keys, die zum vollständigen Datenbestand gehören.
const BACKUP_KEYS = ['companies', 'checkins', 'checkins_trash', 'class_school_days', 'custom_holidays']

// GET: Erstellt ein vollständiges Backup-Objekt aller Daten.
export async function GET() {
  try {
    const data = {}
    for (const key of BACKUP_KEYS) {
      data[key] = await redis.get(key)
    }
    const backup = {
      version: 1,
      createdAt: new Date().toISOString(),
      data,
    }
    return NextResponse.json(backup)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Stellt ein Backup wieder her ODER speichert einen internen Snapshot.
export async function POST(req) {
  try {
    const body = await req.json()

    // --- Wiederherstellung aus hochgeladenem Backup ---
    if (body.action === 'restore') {
      const backup = body.backup
      if (!backup || !backup.data || typeof backup.data !== 'object') {
        return NextResponse.json({ error: 'Ungültiges Backup-Format' }, { status: 400 })
      }
      // Sicherheits-Snapshot vom aktuellen Stand, bevor überschrieben wird
      const safetySnapshot = {}
      for (const key of BACKUP_KEYS) {
        safetySnapshot[key] = await redis.get(key)
      }
      await redis.set('backup_before_restore', { createdAt: new Date().toISOString(), data: safetySnapshot })

      // Restore einspielen
      let restoredKeys = 0
      for (const key of BACKUP_KEYS) {
        if (key in backup.data && backup.data[key] !== undefined && backup.data[key] !== null) {
          await redis.set(key, backup.data[key])
          restoredKeys++
        }
      }
      return NextResponse.json({ status: 'restored', restoredKeys })
    }

    // --- Internen Snapshot speichern (z.B. vor "Alles löschen") ---
    if (body.action === 'snapshot') {
      const label = body.label || 'manual'
      const data = {}
      for (const key of BACKUP_KEYS) {
        data[key] = await redis.get(key)
      }
      const snapshot = { version: 1, createdAt: new Date().toISOString(), label, data }
      // Snapshots werden in einer Liste gehalten, die letzten 10 bleiben erhalten
      let snapshots = await redis.get('backup_snapshots') || []
      if (!Array.isArray(snapshots)) snapshots = []
      snapshots.unshift(snapshot)
      snapshots = snapshots.slice(0, 10)
      await redis.set('backup_snapshots', snapshots)
      return NextResponse.json({ status: 'snapshot_saved', count: snapshots.length })
    }

    // --- Liste der internen Snapshots abrufen ---
    if (body.action === 'list_snapshots') {
      let snapshots = await redis.get('backup_snapshots') || []
      if (!Array.isArray(snapshots)) snapshots = []
      // Nur Metadaten zurückgeben (ohne die schweren Daten), plus Index
      const meta = snapshots.map((s, i) => ({
        index: i,
        createdAt: s.createdAt,
        label: s.label || 'manual',
        companies: Array.isArray(s.data?.companies) ? s.data.companies.length : 0,
        checkins: Array.isArray(s.data?.checkins) ? s.data.checkins.length : 0,
      }))
      return NextResponse.json(meta)
    }

    // --- Internen Snapshot wiederherstellen ---
    if (body.action === 'restore_snapshot') {
      const idx = body.index
      let snapshots = await redis.get('backup_snapshots') || []
      if (!Array.isArray(snapshots) || !snapshots[idx]) {
        return NextResponse.json({ error: 'Snapshot nicht gefunden' }, { status: 404 })
      }
      const snapshot = snapshots[idx]
      // Sicherheits-Snapshot vom aktuellen Stand
      const safetySnapshot = {}
      for (const key of BACKUP_KEYS) {
        safetySnapshot[key] = await redis.get(key)
      }
      await redis.set('backup_before_restore', { createdAt: new Date().toISOString(), data: safetySnapshot })

      let restoredKeys = 0
      for (const key of BACKUP_KEYS) {
        if (key in snapshot.data && snapshot.data[key] !== undefined && snapshot.data[key] !== null) {
          await redis.set(key, snapshot.data[key])
          restoredKeys++
        }
      }
      return NextResponse.json({ status: 'restored', restoredKeys })
    }

    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
