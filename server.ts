import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import puppeteer from "puppeteer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/screenshot", async (req, res) => {
    let { url, viewport = 'desktop', colorScheme = 'light', fullPage = true } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    // Ensure URL has protocol
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    try {
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
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
      
      // Go to the page and wait for network to be mostly idle
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

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

      const screenshot = await page.screenshot({ fullPage: Boolean(fullPage), type: 'png' });
      await browser.close();

      res.set('Content-Type', 'image/png');
      res.send(screenshot);
    } catch (error: any) {
      console.error("Screenshot error:", error);
      res.status(500).json({ error: "Failed to capture screenshot", details: error.message });
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
