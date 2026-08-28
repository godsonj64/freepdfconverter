import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
// import puppeteer from "puppeteer-extra";
// import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

// puppeteer.use(StealthPlugin());

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));
  
  app.post("/api/secure-pdf", async (req, res) => {
    try {
      const { pdfBase64, password, watermark } = req.body;
      if (!pdfBase64) return res.status(400).json({ error: "PDF base64 is required" });

      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      
      if (watermark) {
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        for (const page of pages) {
          const { width, height } = page.getSize();
          page.drawText(watermark, {
            x: width / 2 - 100,
            y: height / 2,
            size: 30,
            font: font,
            color: rgb(0.8, 0.8, 0.8),
            opacity: 0.3,
            rotate: degrees(-45),
          });
        }
      }

      const finalPdfBytes = await pdfDoc.save({ useObjectStreams: false });

      const signedBase64 = Buffer.from(finalPdfBytes).toString('base64');
      res.json({ pdfBase64: signedBase64 });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/screenshot", async (req, res) => {
    res.status(501).json({ error: "Web screenshots are not supported in this environment.", details: "Puppeteer is unavailable." });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
