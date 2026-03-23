import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, ShadingType } from 'docx'

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

const WEEKDAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const SCHOOL_DAYS = [3, 4]

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: '999999' }
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder }

function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    shading: { type: ShadingType.SOLID, color: 'E8E8E8' },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, font: 'Arial', size: 20 })] })],
  })
}

function dataCell(text, width, options = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    children: [new Paragraph({
      alignment: options.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, font: 'Arial', size: 20, ...options })]
    })],
  })
}

function emptyCell(width, height) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    children: [new Paragraph({ spacing: { before: height || 200, after: height || 200 }, children: [new TextRun({ text: '', font: 'Arial', size: 20 })] })],
  })
}

export async function POST(req) {
  try {
    const { companyId, startDate, endDate } = await req.json()
    const companies = await redis.get('companies') || []
    const checkins = await redis.get('checkins') || []
    const company = companies.find(c => c.id === companyId)

    if (!company) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const missingDays = []
    const current = new Date(startDate)
    const end = new Date(endDate)
    const today = new Date().toISOString().split('T')[0]

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const dayNum = current.getDay()
      if (dayNum !== 0 && dayNum !== 6 && !SCHOOL_DAYS.includes(dayNum) && dateStr <= today) {
        const hasCheckin = checkins.some(c => c.companyId === companyId && c.date === dateStr)
        if (!hasCheckin) {
          missingDays.push({
            date: dateStr,
            weekday: WEEKDAY_NAMES[dayNum],
            formatted: `${dateStr.split('-')[2]}.${dateStr.split('-')[1]}.${dateStr.split('-')[0]}`
          })
        }
      }
      current.setDate(current.getDate() + 1)
    }

    const startF = `${startDate.split('-')[2]}.${startDate.split('-')[1]}.${startDate.split('-')[0]}`
    const endF = `${endDate.split('-')[2]}.${endDate.split('-')[1]}.${endDate.split('-')[0]}`

    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
      sections: [{
        properties: { page: { margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } } },
        children: [
          new Paragraph({ spacing: { after: 80 }, children: [
            new TextRun({ text: 'Berufskolleg Kleve', font: 'Arial', size: 18, color: '666666' }),
            new TextRun({ text: '  |  ', font: 'Arial', size: 18, color: 'CCCCCC' }),
            new TextRun({ text: 'PraxisCheck \u2013 Anwesenheitskontrolle', font: 'Arial', size: 18, color: '666666' }),
          ]}),
          new Paragraph({ spacing: { after: 300 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CC0000' } }, children: [] }),
          new Paragraph({ spacing: { before: 100, after: 200 }, children: [
            new TextRun({ text: 'Fehlbericht \u2013 Nicht eingecheckte Praktikumstage', font: 'Arial', size: 28, bold: true, color: '1a1a1a' }),
          ]}),
          new Table({ width: { size: 9400, type: WidthType.DXA }, rows: [
            new TableRow({ children: [
              dataCell('Betrieb:', 2000, { bold: true }), dataCell(company.name, 3200),
              dataCell('K\u00fcrzel:', 1200, { bold: true }), dataCell(company.code, 3000),
            ]}),
            new TableRow({ children: [
              dataCell('Klasse:', 2000, { bold: true }), dataCell(company.klasse || '\u2013', 3200),
              dataCell('Zeitraum:', 1200, { bold: true }), dataCell(`${startF} \u2013 ${endF}`, 3000),
            ]}),
          ]}),
          new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),
          new Paragraph({ spacing: { after: 200 }, children: [
            new TextRun({ text: missingDays.length > 0
              ? `An den folgenden ${missingDays.length} Praktikumstag${missingDays.length === 1 ? '' : 'en'} wurde kein digitaler Check-in registriert:`
              : 'Im angegebenen Zeitraum wurden keine fehlenden Check-ins festgestellt. Alle Praktikumstage wurden erfolgreich eingecheckt.',
              font: 'Arial', size: 22, color: '333333' }),
          ]}),
          ...(missingDays.length > 0 ? [
            new Table({ width: { size: 9400, type: WidthType.DXA }, rows: [
              new TableRow({ children: [
                headerCell('Datum', 2400), headerCell('Wochentag', 2000),
                headerCell('Anwesend? (ja/nein)', 1800), headerCell('Unterschrift Betrieb', 3200),
              ]}),
              ...missingDays.map(day => new TableRow({ children: [
                dataCell(day.formatted, 2400, { center: true }),
                dataCell(day.weekday, 2000, { center: true }),
                emptyCell(1800, 300), emptyCell(3200, 300),
              ]})),
            ]}),
          ] : []),
          new Paragraph({ spacing: { before: 400, after: 100 }, children: [] }),
          new Paragraph({ spacing: { after: 80 }, children: [
            new TextRun({ text: 'Bitte best\u00e4tigen Sie mit Ihrer Unterschrift, ob der/die Praktikant/in an den oben aufgef\u00fchrten Tagen anwesend war oder nicht.', font: 'Arial', size: 20, color: '555555', italics: true }),
          ]}),
          new Paragraph({ spacing: { before: 500 }, children: [] }),
          new Table({ width: { size: 9400, type: WidthType.DXA }, borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder }, rows: [
            new TableRow({ children: [
              new TableCell({ width: { size: 4200, type: WidthType.DXA }, borders: { ...noBorders, bottom: { style: BorderStyle.SINGLE, size: 1, color: '333333' } }, children: [new Paragraph({ spacing: { before: 600 }, children: [] })] }),
              new TableCell({ width: { size: 1000, type: WidthType.DXA }, borders: noBorders, children: [new Paragraph({ children: [] })] }),
              new TableCell({ width: { size: 4200, type: WidthType.DXA }, borders: { ...noBorders, bottom: { style: BorderStyle.SINGLE, size: 1, color: '333333' } }, children: [new Paragraph({ spacing: { before: 600 }, children: [] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ width: { size: 4200, type: WidthType.DXA }, borders: noBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Datum', font: 'Arial', size: 18, color: '666666' })] })] }),
              new TableCell({ width: { size: 1000, type: WidthType.DXA }, borders: noBorders, children: [new Paragraph({ children: [] })] }),
              new TableCell({ width: { size: 4200, type: WidthType.DXA }, borders: noBorders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Stempel und Unterschrift des Betriebs', font: 'Arial', size: 18, color: '666666' })] })] }),
            ]}),
          ]}),
          new Paragraph({ spacing: { before: 400 }, border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } }, children: [
            new TextRun({ text: 'Dieses Dokument wurde automatisch von PraxisCheck generiert.', font: 'Arial', size: 16, color: '999999', italics: true }),
          ]}),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Fehlbericht_${company.code}.docx"`,
      },
    })
  } catch (e) {
    console.error('Report error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
