import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';

/**
 * Stamps a diagonal text watermark on every page. Runs in the browser, so it
 * works on static hosting and isn't bound by serverless request-size limits.
 */
export async function applyWatermark(blob: Blob, watermark: string): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(await blob.arrayBuffer());
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(watermark, {
      x: width / 2 - 100,
      y: height / 2,
      size: 30,
      font,
      color: rgb(0.8, 0.8, 0.8),
      opacity: 0.3,
      rotate: degrees(-45),
    });
  }
  const bytes = await pdfDoc.save({ useObjectStreams: false });
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
