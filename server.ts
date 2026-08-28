import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

puppeteer.use(StealthPlugin());

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
    let { url, viewport = 'desktop', colorScheme = 'light', fullPage = true, selector, cookieString } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    // Ensure URL has protocol
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox'
        ]
      });
      const page = await browser.newPage();
      
      let vpConfig = { width: 1440, height: 900, deviceScaleFactor: 2 };
      if (viewport === 'tablet') {
        vpConfig = { width: 768, height: 1024, deviceScaleFactor: 2 };
      } else if (viewport === 'mobile') {
        vpConfig = { width: 390, height: 844, deviceScaleFactor: 2 };
      }
      await page.setViewport(vpConfig);
      
      if (colorScheme === 'dark') {
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
      } else {
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
      }

      // Inject cookies if provided
      if (cookieString) {
        try {
          const domain = new URL(url).hostname;
          const cookies = cookieString.split(';').map((pair: string) => {
            const [name, ...rest] = pair.trim().split('=');
            return { name: name.trim(), value: rest.join('=').trim(), domain };
          }).filter((c: any) => c.name && c.value);
          await page.setCookie(...cookies);
        } catch (e) {
          console.warn("Invalid cookie string or url", e);
        }
      }
      
      // Go to the page and wait for the DOM to load, fallback safely if it times out
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        // Give the page a little extra time to hydrate and load initial assets
        await new Promise(r => setTimeout(r, 5000));
      } catch (navError: any) {
        console.warn(`Navigation timeout or error for ${url}, attempting to proceed anyway:`, navError.message);
      }

      // Attempt to auto-close or accept cookie banners
      await page.evaluate(() => {
        const acceptTexts = ['accept', 'agree', 'allow', 'got it', 'dismiss', 'close', 'ok', 'accept all', 'allow all', 'accept all cookies'];
        const bannerSelectors = [
          '#onetrust-accept-btn-handler',
          '.cc-btn.cc-allow',
          '.cc-btn.cc-dismiss',
          '.cc-allow',
          '.cc-dismiss',
          'button[data-cookiebanner="accept_button"]',
          '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
          'button[id*="sp-cc-accept"]',
          '#accept-cookie-notification'
        ];
        
        // 1. Try exact known selectors
        for (const selector of bannerSelectors) {
          const btn = document.querySelector(selector) as HTMLElement | null;
          if (btn && btn.click && btn.offsetWidth > 0) {
            btn.click();
            return;
          }
        }
        
        // 2. Fallback to heuristic text search on buttons and links
        const elements = Array.from(document.querySelectorAll('button, a'));
        for (const el of elements) {
          const text = (el.textContent || '').trim().toLowerCase();
          if (acceptTexts.includes(text) || text.includes('accept all cookies') || text.includes('allow all cookies')) {
            const htmlEl = el as HTMLElement;
            if (htmlEl.offsetWidth > 0 && htmlEl.offsetHeight > 0) {
              htmlEl.click();
              return; 
            }
          }
        }
      });
      
      // Wait a moment for banner to animate away
      await new Promise(r => setTimeout(r, 800));

      if (fullPage) {
        // Auto-scroll to trigger lazy loading of images and background assets
        await page.evaluate(async () => {
          await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 250;
            const timer = setInterval(() => {
              const scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;

              if (totalHeight >= scrollHeight - window.innerHeight) {
                clearInterval(timer);
                window.scrollTo(0, 0);
                resolve();
              }
            }, 80);
          });
        });

        // Wait for any remaining lazy-loaded images or fonts
        await new Promise(r => setTimeout(r, 1500));
      }

      let screenshot: Buffer | Uint8Array | string;
      if (selector) {
        // Wait for selector just in case it loads late
        await page.waitForSelector(selector, { timeout: 10000 }).catch(() => {});
        const element = await page.$(selector);
        if (element) {
          screenshot = await element.screenshot({ type: 'png' });
        } else {
          throw new Error(`Element with selector "${selector}" not found`);
        }
      } else {
        screenshot = await page.screenshot({ fullPage: Boolean(fullPage), type: 'png' });
      }

      res.set('Content-Type', 'image/png');
      res.send(screenshot);
    } catch (error: any) {
      console.error("Screenshot error:", error);
      res.status(500).json({ error: "Failed to capture screenshot", details: error.message });
    } finally {
      if (browser) {
        await browser.close().catch(console.error);
      }
    }
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
