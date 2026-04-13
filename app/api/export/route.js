import { NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, WidthType, BorderStyle, VerticalAlign, Footer,
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
  const boxBorder = { style: BorderStyle.SINGLE, size: 18, color: "0a3d5c" };

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 600, right: 720, bottom: 600, left: 720 },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: name, size: 18, font: "Arial", color: "666666", italics: true }),
              ],
            }),
          ],
        }),
      },
      children: [

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 180 },
          children: [new TextRun({
            text: "Anwesenheit im Praktikum",
            bold: true, size: 52, font: "Arial",
          })],
        }),

        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: "Wichtig:", bold: true, size: 22, font: "Arial" })],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: "\u2714  Jeden Praktikumstag morgens einchecken", size: 20, font: "Arial" })],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: "\u2714  ", size: 20, font: "Arial" }),
            new TextRun({ text: "Immer", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: " BEIDE Schritte machen (QR + NFC)", bold: true, size: 20, font: "Arial" }),
          ],
        }),
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({ text: "\u2714  ", size: 20, font: "Arial" }),
            new TextRun({ text: "Kein", bold: true, size: 20, font: "Arial" }),
            new TextRun({ text: " Check-in = Fehltag!", bold: true, size: 20, font: "Arial" }),
          ],
        }),

        new Paragraph({
          spacing: { after: 240 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } },
          children: [],
        }),

        new Table({
          width: { size: 10466, type: WidthType.DXA },
          columnWidths: [10466],
          rows: [
            new TableRow({ children: [new TableCell({
              borders: { top: boxBorder, left: boxBorder, right: boxBorder, bottom: noBorder },
              margins: { top: 160, bottom: 100, left: 300, right: 300 },
              children: [new Paragraph({ children: [
                new TextRun({ text: "Schritt 1", bold: true, underline: {}, size: 32, font: "Arial" }),
                new TextRun({ text: ": QR-Code scannen", size: 32, font: "Arial" }),
              ]})],
            })]},),
            new TableRow({ children: [new TableCell({
              borders: { top: noBorder, left: boxBorder, right: boxBorder, bottom: noBorder },
              margins: { top: 240, bottom: 100, left: 300, right: 300 },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "\u2193  Handy-Kamera auf diesen Code halten  \u2193", italics: true, size: 20, font: "Arial" })],
              })],
            })]},),
            new TableRow({ children: [new TableCell({
              borders: { top: noBorder, left: boxBorder, right: boxBorder, bottom: noBorder },
              margins: { top: 180, bottom: 180, left: 300, right: 300 },
              verticalAlign: VerticalAlign.CENTER,
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new ImageRun({
                  data: qrBuffer,
                  transformation: { width: 280, height: 280 },
                  type: "png",
                })],
              })],
            })]},),
            new TableRow({ children: [new TableCell({
              borders: { top: noBorder, left: boxBorder, right: boxBorder, bottom: boxBorder },
              margins: { top: 100, bottom: 200, left: 300, right: 300 },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "\u2192  Klicke auf den angezeigten Link!  \u2192  ", size: 20, font: "Arial" }),
                  new TextRun({ text: "GELBER Haken = eingecheckt", bold: true, size: 20, font: "Arial" }),
                ],
              })],
            })]},),
          ],
        }),

        new Paragraph({ spacing: { after: 240 }, children: [] }),

        new Table({
          width: { size: 10466, type: WidthType.DXA },
          columnWidths: [10466],
          rows: [
            new TableRow({ children: [new TableCell({
              borders: { top: boxBorder, left: boxBorder, right: boxBorder, bottom: noBorder },
              margins: { top: 160, bottom: 100, left: 300, right: 300 },
              children: [new Paragraph({ children: [
                new TextRun({ text: "Schritt 2", bold: true, underline: {}, size: 32, font: "Arial" }),
                new TextRun({ text: ": Handy an NFC-Tag halten", size: 32, font: "Arial" }),
              ]})],
            })]},),
            new TableRow({ children: [new TableCell({
              borders: { top: noBorder, left: boxBorder, right: boxBorder, bottom: noBorder },
              margins: { top: 240, bottom: 100, left: 300, right: 300 },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "\u2193  Handy HIER an den Aufkleber halten  \u2193", italics: true, size: 20, font: "Arial" })],
              })],
            })]},),
            new TableRow({ children: [new TableCell({
              borders: { top: noBorder, left: boxBorder, right: boxBorder, bottom: noBorder },
              margins: { top: 160, bottom: 160, left: 300, right: 300 },
              children: [
                new Paragraph({ spacing: { before: 500, after: 500 }, alignment: AlignmentType.CENTER, children: [] }),
              ],
            })]},),
            new TableRow({ children: [new TableCell({
              borders: { top: noBorder, left: boxBorder, right: boxBorder, bottom: boxBorder },
              margins: { top: 100, bottom: 200, left: 300, right: 300 },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "\u2192  Klicke auf den angezeigten Link!  \u2192  ", size: 20, font: "Arial" }),
                  new TextRun({ text: "GR\u00dcNER Haken = best\u00e4tigt!", bold: true, size: 20, font: "Arial" }),
                ],
              })],
            })]},),
          ],
        }),

        new Paragraph({
          spacing: { before: 240, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "\u2139 Falls ein Check-in nicht m\u00f6glich ist, melde dich noch am gleichen Tag bei deinem Klassenlehrer!", italics: true, size: 18, font: "Arial", color: "CC0000" }),
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
