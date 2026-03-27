import { NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, WidthType, BorderStyle, VerticalAlign,
} from "docx";
import QRCode from "qrcode";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const name = searchParams.get("name");
  const baseUrl = searchParams.get("baseUrl") || "https://praxischeck.vercel.app";

  if (!code || !name) {
    return NextResponse.json({ error: "code und name erforderlich" }, { status: 400 });
  }

  // ── QR-Code als PNG-Buffer ──
  const qrUrl = `${baseUrl}/c/${code}`;
  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#0a3d5c", light: "#ffffff" },
  });

  // ── Border-Definitionen ──
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const boxBorder = { style: BorderStyle.SINGLE, size: 18, color: "0a3d5c" };

  // ── Dokument ──
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [

        // Titel
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({
            text: "Anwesenheit im Praktikum",
            bold: true, size: 52, font: "Arial",
          })],
        }),

        // Wichtig
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: "Wichtig:", bold: true, size: 24, font: "Arial" })],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: "\u2714  Jeden Praktikumstag morgens einchecken", size: 22, font: "Arial" })],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "\u2714  ", size: 22, font: "Arial" }),
            new TextRun({ text: "Immer", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: " BEIDE Schritte machen (QR + NFC)", bold: true, size: 22, font: "Arial" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 360 },
          children: [
            new TextRun({ text: "\u2714  ", size: 22, font: "Arial" }),
            new TextRun({ text: "Kein", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: " Check-in = Fehltag!", bold: true, size: 22, font: "Arial" }),
          ],
        }),

        // Trennlinie
        new Paragraph({
          spacing: { after: 360 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } },
          children: [],
        }),

        // ── Schritt 1 Box ──
        new Table({
          width: { size: 10466, type: WidthType.DXA },
          columnWidths: [10466],
          rows: [
            // Überschrift
            new TableRow({ children: [new TableCell({
              borders: { top: boxBorder, left: boxBorder, right: boxBorder, bottom: noBorder },
              margins: { top: 200, bottom: 120, left: 300, right: 300 },
              children: [new Paragraph({ children: [
                new TextRun({ text: "Schritt 1", bold: true, underline: {}, size: 36, font: "Arial" }),
                new TextRun({ text: ": QR-Code scannen", size: 36, font: "Arial" }),
              ]})],
            })]},),
            // Anweisung
            new TableRow({ children: [new TableCell({
              borders: { top: noBorder, left: boxBorder, right: boxBorder, bottom: noBorder },
              margins: { top: 320, bottom: 120, left: 300, right: 300 },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "\u2193  Handy-Kamera auf diesen Code halten  \u2193", italics: true, size: 22, font: "Arial" })],
              })],
            })]},),
            // QR-Code
            new TableRow({ children: [new TableCell({
              borders: { top: noBorder, left: boxBorder, right: boxBorder, bottom: noBorder },
              margins: { top: 240, bottom: 240, left: 300, right: 300 },
              verticalAlign: VerticalAlign.CENTER,
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new ImageRun({
                  data: qrBuffer,
                  transformation: { width: 260, height: 260 },
                  type: "png",
                })],
              })],
            })]},),
            // Bestätigung
            new TableRow({ children: [new TableCell({
              borders: { top: noBorder, left: boxBorder, right: boxBorder, bottom: boxBorder },
              margins: { top: 120, bottom: 240, left: 300, right: 300 },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "\u2192  Link \u00f6ffnet sich automatisch  \u2192  ", size: 22, font: "Arial" }),
                  new TextRun({ text: "GELBER Haken = eingecheckt", bold: true, size: 22, font: "Arial" }),
                ],
              })],
            })]},),
          ],
        }),

        // Abstand
        new Paragraph({ spacing: { after: 360 }, children: [] }),

        // ── Schritt 2 Box ──
        new Table({
          width: { size: 10466, type: WidthType.DXA },
          columnWidths: [10466],
          rows: [
            // Überschrift
            new TableRow({ children: [new TableCell({
              borders: { top: boxBorder, left: boxBorder, right: boxBorder, bottom: noBorder },
              margins: { top: 200, bottom: 120, left: 300, right: 300 },
              children: [new Paragraph({ children: [
                new TextRun({ text: "Schritt 2", bold: true, underline: {}, size: 36, font: "Arial" }),
                new TextRun({ text: ": Handy an NFC-Tag halten", size: 36, font: "Arial" }),
              ]})],
            })]},),
            // Anweisung
            new TableRow({ children: [new TableCell({
              borders: { top: noBorder, left: boxBorder, right: boxBorder, bottom: noBorder },
              margins: { top: 320, bottom: 120, left: 300, right: 300 },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "\u2193  Handy HIER an den Aufkleber halten  \u2193", italics: true, size: 22, font: "Arial" })],
              })],
            })]},),
            // NFC-Platzhalter (kleiner Kasten)
            new TableRow({ children: [new TableCell({
              borders: { top: noBorder, left: boxBorder, right: boxBorder, bottom: noBorder },
              margins: { top: 200, bottom: 200, left: 300, right: 300 },
              children: [
                new Paragraph({ spacing: { before: 600, after: 600 }, alignment: AlignmentType.CENTER, children: [] }),
              ],
            })]},),
            // Bestätigung
            new TableRow({ children: [new TableCell({
              borders: { top: noBorder, left: boxBorder, right: boxBorder, bottom: boxBorder },
              margins: { top: 120, bottom: 240, left: 300, right: 300 },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "\u2192  Link \u00f6ffnet sich automatisch  \u2192  ", size: 22, font: "Arial" }),
                  new TextRun({ text: "GR\u00dcNER Haken = best\u00e4tigt!", bold: true, size: 22, font: "Arial" }),
                ],
              })],
            })]},),
          ],
        }),

      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="PraxisCheck_${code}_${name.replace(/\s+/g, "_")}.docx"`,
    },
  });
}
