import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import ExcelJS from 'exceljs'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const PROJECT_START = '2026-04-13'

const NRW_FERIEN = [
  ['2026-03-30', '2026-04-11'],
  ['2026-05-26', '2026-05-26'],
  ['2026-07-20', '2026-09-01'],
  ['2026-10-17', '2026-10-31'],
  ['2026-12-23', '2027-01-06'],
  ['2027-03-29', '2027-04-12'],
  ['2027-05-25', '2027-05-25'],
  ['2027-07-05', '2027-08-17'],
]

function isInHoliday(d) {
  return NRW_FERIEN.some(([s, e]) => d >= s && d <= e)
}

function getMonday(d) {
  const date = new Date(d)
  date.setHours(12, 0, 0, 0)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date
}

function fmtDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export async function POST(req) {
  try {
    const { weeksBack, klasse, showSchoolDays, showHolidays } = await req.json()

    const companies = (await redis.get('companies') || []).filter(c => !c.archived)
    const checkins = await redis.get('checkins') || []
    const classSchoolDays = await redis.get('class_school_days') || {}

    const filteredCompanies = (klasse ? companies.filter(c => c.klasse === klasse) : companies)
      .slice().sort((a, b) => a.name.localeCompare(b.name, 'de'))

    // Datumsbereich: aktuelle Woche minus weeksBack-1 bis aktuelle Woche
    const now = new Date()
    const todayStr = fmtDate(now)
    const allDates = []
    for (let i = weeksBack - 1; i >= 0; i--) {
      const m = getMonday(new Date(now.getTime() - i * 7 * 86400000))
      for (let k = 0; k < 6; k++) {
        const d = new Date(m); d.setDate(m.getDate() + k)
        const ds = fmtDate(d)
        if (ds >= PROJECT_START && ds <= todayStr) allDates.push(ds)
      }
    }

    const wb = new ExcelJS.Workbook()
    wb.creator = 'PraxisCheck'
    wb.created = new Date()

    const ws = wb.addWorksheet('Anwesenheit', {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 2 }],
    })

    // Titel + Legende oben
    ws.mergeCells(1, 1, 1, Math.max(4, allDates.length + 3))
    const titleCell = ws.getCell(1, 1)
    titleCell.value = `PraxisCheck – Anwesenheitsexport${klasse ? ' – ' + klasse : ''}  |  Legende: 1 = anwesend (grün), 0 = abwesend (rot), S = Schultag, F = Ferien, – = außerhalb Praktikumszeitraum`
    titleCell.font = { bold: true, size: 11 }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
    ws.getRow(1).height = 22

    // Header-Zeile
    const headerRow = ws.getRow(2)
    headerRow.getCell(1).value = 'Kürzel'
    headerRow.getCell(2).value = 'Betrieb'
    headerRow.getCell(3).value = 'Klasse'
    allDates.forEach((d, i) => {
      const day = new Date(d + 'T12:00:00').getDay()
      const dd = d.split('-')[2], mm = d.split('-')[1]
      headerRow.getCell(4 + i).value = `${WEEKDAYS[day]} ${dd}.${mm}.`
    })
    headerRow.eachCell(c => {
      c.font = { bold: true, size: 10 }
      c.alignment = { horizontal: 'center', vertical: 'middle' }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } }
      c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    })
    headerRow.height = 20

    // Datenzeilen
    filteredCompanies.forEach((co, rIdx) => {
      const row = ws.getRow(3 + rIdx)
      row.getCell(1).value = co.code
      row.getCell(2).value = co.name
      row.getCell(3).value = co.klasse || ''
      row.getCell(1).font = { bold: true }

      const coSchoolDays = (co.klasse && classSchoolDays[co.klasse]) || []
      const coStart = co.startDate || PROJECT_START
      const coEnd = co.endDate || '2099-12-31'

      allDates.forEach((d, i) => {
        const cell = row.getCell(4 + i)
        const day = new Date(d + 'T12:00:00').getDay()
        const isSchoolDay = coSchoolDays.includes(day)
        const isHoliday = isInHoliday(d)
        const outsideRange = d < coStart || d > coEnd
        const ci = checkins.find(c => c.companyId === co.id && c.date === d)

        if (outsideRange) {
          cell.value = '–'
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }
        } else if (isHoliday) {
          cell.value = 'F'
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE8B0' } }
        } else if (isSchoolDay) {
          cell.value = 'S'
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0E0FF' } }
        } else if (ci) {
          cell.value = 1
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8FE8A8' } }
          cell.font = { bold: true, color: { argb: 'FF0A5A1F' } }
        } else if (d <= todayStr) {
          cell.value = 0
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFB0B0' } }
          cell.font = { bold: true, color: { argb: 'FF8B0000' } }
        } else {
          cell.value = ''
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } }
      })
    })

    // Spaltenbreiten
    ws.getColumn(1).width = 8
    ws.getColumn(2).width = 28
    ws.getColumn(3).width = 8
    for (let i = 0; i < allDates.length; i++) ws.getColumn(4 + i).width = 9

    // Optional: Schultag-Spalten ausblenden, wenn showSchoolDays = false
    if (!showSchoolDays) {
      allDates.forEach((d, i) => {
        // Wenn ein Datum für ALLE Klassen Schultag ist, dann hidden
        // Da klassenspezifisch, nutzen wir hier: wenn klasse-Filter gesetzt, dann nach dieser Klasse, sonst alle
        const day = new Date(d + 'T12:00:00').getDay()
        let hide = false
        if (klasse && classSchoolDays[klasse]) {
          hide = classSchoolDays[klasse].includes(day)
        }
        if (hide) ws.getColumn(4 + i).hidden = true
      })
    }
    if (!showHolidays) {
      allDates.forEach((d, i) => {
        if (isInHoliday(d)) ws.getColumn(4 + i).hidden = true
      })
    }

    const buffer = await wb.xlsx.writeBuffer()
    const filename = `PraxisCheck_Export${klasse ? '_' + klasse : ''}_${todayStr}.xlsx`
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    console.error('XLSX export error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
