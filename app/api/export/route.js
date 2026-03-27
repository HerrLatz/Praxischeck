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

  const qrUrl = `${baseUrl}/c/${code}`;
  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#0a3d5c", light: "#ffffff" },
  });

  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const boxBorder = { style: BorderStyle.SINGLE, size: 24, color: "0a3d5c" };
  const boxBorderBottom = { style: BorderStyle.SINGLE, size: 24, color: "0a3d5c" };

  // Helper: cell with consistent borders (left+right always, top/bottom configurable)
  function boxCell(children, { top = false, bottom = false, paddingTop = 100, paddingBottom = 100 } = {}) {
    return new TableCell({
      width: { size: 10466, type: WidthType.DXA },
      borders: {
        top: top ? boxBorder : noBorder,
        bottom: bottom ? boxBorderBottom : noBorder,
        left: boxBorder,
        right: boxBorder,
      },
      children: [
        new Paragraph({ spacing: { before: paddingTop }, children: [] }),
        ...children,
        new Paragraph({ spacing: { after: paddingBottom }, children: [] }),
      ],
    });
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
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
            new TextRun({ text: "Immer BEIDE Schritte machen (QR + NFC)", bold: true, size: 22, font: "Arial" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 360 },
          children: [
            new TextRun({ text: "\u2714  ", size: 22, font: "Arial" }),
            new TextRun({ text: "Kein Check-in = Fehltag!", bold: true, size: 22, font: "Arial" }),
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
            new TableRow({ children: [boxCell([
              new Paragraph({ indent: { left: 200 }, children: [
                new TextRun({ text: "Schritt 1", bold: true, underline: {}, size: 36, font: "Arial" }),
                new TextRun({ text: ": QR-Code scannen", size: 36, font: "Arial" }),
              ]}),
            ], { top: true, paddingTop: 150, paddingBottom: 50 })] }),

            new TableRow({ children: [boxCell([
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "\u2193  Handy-Kamera auf diesen Code halten  \u2193", italics: true, size: 22, font: "Arial" })],
              }),
            ], { paddingTop: 200, paddingBottom: 100 })] }),

            new TableRow({ children: [boxCell([
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new ImageRun({
                  data: qrBuffer,
                  transformation: { width: 260, height: 260 },
                  type: "png",
                })],
              }),
            ], { paddingTop: 50, paddingBottom: 50 })] }),

            new TableRow({ children: [boxCell([
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "\u2192  Link \u00F6ffnet sich automatisch  \u2192  ", size: 22, font: "Arial" }),
                  new TextRun({ text: "GELBER Haken = eingecheckt", bold: true, size: 22, font: "Arial" }),
                ],
              }),
            ], { bottom: true, paddingTop: 50, paddingBottom: 200 })] }),
          ],
        }),

        // Abstand
        new Paragraph({ spacing: { after: 360 }, children: [] }),

        // ── Schritt 2 Box ──
        new Table({
          width: { size: 10466, type: WidthType.DXA },
          columnWidths: [10466],
          rows: [
            new TableRow({ children: [boxCell([
              new Paragraph({ indent: { left: 200 }, children: [
                new TextRun({ text: "Schritt 2", bold: true, underline: {}, size: 36, font: "Arial" }),
                new TextRun({ text: ": Handy an NFC-Tag halten", size: 36, font: "Arial" }),
              ]}),
            ], { top: true, paddingTop: 150, paddingBottom: 50 })] }),

            new TableRow({ children: [boxCell([
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "\u2193  Handy HIER an den Aufkleber halten  \u2193", italics: true, size: 22, font: "Arial" })],
              }),
            ], { paddingTop: 200, paddingBottom: 100 })] }),

            new TableRow({ children: [boxCell([
              new Paragraph({ spacing: { before: 400, after: 400 }, alignment: AlignmentType.CENTER, children: [
                new TextRun({ text: "(  NFC-Tag hier aufkleben  )", size: 24, font: "Arial", color: "999999" }),
              ]}),
            ], { paddingTop: 50, paddingBottom: 50 })] }),

            new TableRow({ children: [boxCell([
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "\u2192  Link \u00F6ffnet sich automatisch  \u2192  ", size: 22, font: "Arial" }),
                  new TextRun({ text: "GR\u00DCNER Haken = best\u00E4tigt!", bold: true, size: 22, font: "Arial" }),
                ],
              }),
            ], { bottom: true, paddingTop: 50, paddingBottom: 200 })] }),
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
      "Content-Disposition": `attachment; filename="PraxisCheck_${code}_${name.replace(/[^a-zA-Z0-9\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df_-]/g, "_")}.docx"`,
    },
  });
}
