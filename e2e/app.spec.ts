import { test, expect, Page } from '@playwright/test';
import { addFiles, download, inspectPdf, makePng, MM_TO_PT, pngSize, queueNames, solid, transparent } from './helpers';

const items = (page: Page) => page.getByTestId('queue-item');
const dims = (page: Page, index: number) => items(page).nth(index).getByText(/\d+ × \d+px/);

async function openSettings(page: Page) {
  await page.getByRole('button', { name: /Customize PDF Settings/ }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('adds images and says which files were skipped', async ({ page }) => {
  await addFiles(page, [
    solid('a.png', 300, 200, [200, 0, 0]),
    solid('b.png', 300, 200, [0, 200, 0]),
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') },
  ]);
  await expect(items(page)).toHaveCount(2);
  await expect(page.getByRole('status')).toContainText('skipped 1');
});

test('demo images load into the queue', async ({ page }) => {
  await page.getByRole('button', { name: 'Load Demo Images' }).click();
  await expect(items(page)).toHaveCount(2);
});

test('a duplicate keeps working after the original is removed', async ({ page }) => {
  await addFiles(page, [solid('a.png', 300, 600, [200, 0, 0])]);
  await page.getByTitle('Duplicate image').click();
  await expect(items(page)).toHaveCount(2);
  expect(await queueNames(page)).toEqual(['1. a.png', '2. a (copy).png']);

  await page.getByTitle('Remove from queue').first().click();
  await expect(items(page)).toHaveCount(1);

  const pdf = await download(page, () => page.getByRole('button', { name: 'Download PDF' }).click());
  expect(inspectPdf(pdf.buffer).pageCount).toBe(1);
});

test('continuous PDF is one page sized to the images', async ({ page }) => {
  await addFiles(page, [solid('square.png', 1000, 1000, [10, 10, 200]), solid('tall.png', 500, 1000, [10, 200, 10])]);
  await expect(items(page)).toHaveCount(2);

  const pdf = await download(page, () => page.getByRole('button', { name: 'Download PDF' }).click());
  expect(pdf.name).toBe('freepdfconverter-document.pdf');
  const { pageCount, mediaBoxes } = inspectPdf(pdf.buffer);
  expect(pageCount).toBe(1);
  const [, , w, h] = mediaBoxes[0];
  expect(w).toBeCloseTo(210 * MM_TO_PT, 0);
  expect(h).toBeCloseTo((210 + 420) * MM_TO_PT, 0);
});

test('A4 export has page numbers, a dated footer and a safe file name', async ({ page }) => {
  await addFiles(page, [
    solid('1.png', 400, 300, [200, 0, 0]),
    solid('2.png', 300, 900, [0, 200, 0]),
    solid('3.png', 500, 500, [0, 0, 200]),
  ]);
  await expect(items(page)).toHaveCount(3);
  await openSettings(page);
  await page.getByRole('button', { name: /A4 Pages/ }).click();
  await page.getByLabel('Add Page Numbers').check();
  await page.getByLabel('Timestamp Footer').check();
  await page.getByPlaceholder('freepdfconverter-document').fill('my/report?.pdf');

  const pdf = await download(page, () => page.getByRole('button', { name: 'Download PDF' }).click());
  expect(pdf.name).toBe('my-report.pdf');
  const { pageCount, mediaBoxes, text } = inspectPdf(pdf.buffer);
  expect(pageCount).toBe(3);
  for (const [, , w, h] of mediaBoxes) {
    expect(w).toBeCloseTo(595.28, 0);
    expect(h).toBeCloseTo(841.89, 0);
  }
  expect(text).toContain('Page 1 of 3');
  expect(text).toMatch(/FreePDFConverter - \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
});

test('preview renders every page with the bundled PDF worker', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));

  await addFiles(page, [solid('1.png', 400, 300, [200, 0, 0]), solid('2.png', 400, 300, [0, 0, 200])]);
  await openSettings(page);
  await page.getByRole('button', { name: /US Letter/ }).click();
  await page.getByRole('button', { name: 'Live Document Preview' }).click();

  const dialog = page.getByRole('dialog', { name: 'PDF preview' });
  await expect(dialog.locator('.react-pdf__Page canvas')).toHaveCount(2, { timeout: 20_000 });
  await expect(dialog).toContainText('2 Pages (US Letter)');
  expect(requests.some((u) => u.includes('unpkg.com'))).toBe(false);
  expect(requests.some((u) => new URL(u).origin === 'http://localhost:4173' && u.includes('pdf.worker'))).toBe(true);

  // The PDF button in the preview downloads the document that is shown.
  const pdf = await download(page, () => dialog.getByRole('button', { name: 'PDF', exact: true }).click());
  expect(inspectPdf(pdf.buffer).pageCount).toBe(2);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('transparent images get a white background in JPEG quality', async ({ page }) => {
  await addFiles(page, [transparent()]);
  await openSettings(page);
  await page.getByRole('button', { name: /High \(92%\)/ }).click();
  await page.getByRole('button', { name: 'Live Document Preview' }).click();

  const canvas = page.locator('.react-pdf__Page canvas').first();
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  // Sample a corner that was fully transparent in the source image.
  await expect
    .poll(
      () =>
        canvas.evaluate((c: HTMLCanvasElement) => {
          const [r, g, b, a] = c.getContext('2d')!.getImageData(5, 5, 1, 1).data;
          return a === 255 ? Math.min(r, g, b) : -1;
        }),
      { timeout: 15_000 }
    )
    .toBeGreaterThan(240);
});

test('long PNG stitches everything at the widest width', async ({ page }) => {
  await addFiles(page, [solid('wide.png', 400, 300, [200, 0, 0]), solid('narrow.png', 200, 300, [0, 0, 200])]);
  const png = await download(page, () => page.getByRole('button', { name: 'Export as Long PNG' }).click());
  expect(png.name).toBe('freepdfconverter-document-stitched.png');
  expect(pngSize(png.buffer)).toEqual({ width: 400, height: 300 + 600 });
});

test('crop dialog fits on screen, crops, and starts fresh for the next image', async ({ page }) => {
  await addFiles(page, [solid('tall.png', 800, 3000, [0, 120, 200]), solid('other.png', 600, 400, [200, 120, 0])]);
  await expect(items(page)).toHaveCount(2);

  await page.getByTitle('Crop image').first().click();
  const dialog = page.getByRole('dialog', { name: 'Crop image' });
  const img = dialog.locator('.ReactCrop img');
  await expect(img).toBeVisible();
  const box = (await img.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await dialog.getByRole('button', { name: 'Apply Crop' }).click();
  await expect(dialog).toBeHidden();

  const [w, h] = (await dims(page, 0).textContent())!.match(/\d+/g)!.map(Number);
  expect(w).toBeGreaterThan(300);
  expect(w).toBeLessThan(500);
  expect(h).toBeGreaterThan(1000);
  expect(h).toBeLessThan(1400);

  await page.getByTitle('Crop image').nth(1).click();
  await expect(dialog.getByRole('button', { name: 'Apply Crop' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('top crop trims every image as displayed, rotation included', async ({ page }) => {
  await addFiles(page, [solid('square.png', 1000, 1000, [200, 0, 0]), solid('wide.png', 800, 400, [0, 0, 200])]);
  await expect(items(page)).toHaveCount(2);
  await page.getByTitle('Rotate 90° Clockwise').nth(1).click();
  await expect(items(page).nth(1)).toContainText('90°');
  await expect(dims(page, 1)).toHaveText('400 × 800px');

  await page.getByLabel('Top crop percentage').fill('10');
  await page.getByRole('button', { name: 'Apply to All' }).click();

  await expect(dims(page, 0)).toHaveText('1000 × 900px');
  await expect(dims(page, 1)).toHaveText('400 × 720px');
  await expect(items(page).nth(1)).not.toContainText('90°');
});

test('move, reverse and clear the queue', async ({ page }) => {
  await addFiles(page, [solid('a.png', 50, 50, [1, 1, 1]), solid('b.png', 50, 50, [2, 2, 2]), solid('c.png', 50, 50, [3, 3, 3])]);
  await expect(items(page)).toHaveCount(3);

  await page.getByTitle('Move down').first().click();
  expect(await queueNames(page)).toEqual(['1. b.png', '2. a.png', '3. c.png']);

  await page.getByTitle('Reverse image sequence').click();
  expect(await queueNames(page)).toEqual(['1. c.png', '2. a.png', '3. b.png']);

  await page.getByTitle('Clear all').click();
  await expect(items(page)).toHaveCount(0);
  await expect(page.getByText('Drop your PNGs or Screenshots here')).toBeVisible();
});

async function imageTransfer(page: Page) {
  return page.evaluateHandle(async () => {
    const c = document.createElement('canvas');
    c.width = 120;
    c.height = 80;
    c.getContext('2d')!.fillRect(0, 0, 120, 80);
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'dropped.png', { type: 'image/png' }));
    return dt;
  });
}

test('files dropped on the queue are added instead of opened by the browser', async ({ page }) => {
  await addFiles(page, [solid('a.png', 50, 50, [9, 9, 9])]);
  await expect(items(page)).toHaveCount(1);

  const dt = await imageTransfer(page);
  const prevented = await page.evaluate((dataTransfer) => {
    const target = document.querySelector('[data-testid="queue-item"]')!;
    for (const type of ['dragenter', 'dragover']) {
      target.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
    const drop = new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true });
    target.dispatchEvent(drop);
    return drop.defaultPrevented;
  }, dt);

  expect(prevented).toBe(true);
  await expect(items(page)).toHaveCount(2);
  expect(await queueNames(page)).toContain('2. dropped.png');
});

test('pasting a screenshot adds it to the queue', async ({ page }) => {
  const dt = await imageTransfer(page);
  await page.evaluate((clipboardData) => {
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
  }, dt);
  await expect(items(page)).toHaveCount(1);
  expect((await queueNames(page))[0]).toMatch(/^1\. clipboard-screenshot-.*\.png$/);
});

test('website capture adds a full-page screenshot', async ({ page }) => {
  let apiUrl: URL | null = null;
  await page.route('https://api.microlink.io/**', (route) => {
    apiUrl = new URL(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ status: 'success', data: { screenshot: { url: 'https://cdn.microlink.test/shot.png' } } }),
    });
  });
  await page.route('https://cdn.microlink.test/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers: { 'access-control-allow-origin': '*' },
      body: makePng(390, 2400, (x, y) => [y % 255, 80, 160, 255]),
    })
  );

  await page.getByRole('tab', { name: 'Website URL' }).click();
  await page.getByRole('button', { name: /Mobile/ }).click();
  await page.getByRole('button', { name: /Dark/ }).click();
  await page.getByLabel('Website address').fill('www.example.com');
  await page.getByRole('button', { name: 'Capture', exact: true }).click();

  await expect(items(page)).toHaveCount(1);
  expect(await queueNames(page)).toEqual(['1. example.com-fullpage-mobile.png']);
  await expect(dims(page, 0)).toHaveText('390 × 2400px');
  expect(apiUrl!.searchParams.get('url')).toBe('https://www.example.com/');
  expect(apiUrl!.searchParams.get('viewport.width')).toBe('390');
  expect(apiUrl!.searchParams.get('colorScheme')).toBe('dark');
});

test('website capture explains the free limit and refuses private addresses', async ({ page }) => {
  let calls = 0;
  await page.route('https://api.microlink.io/**', (route) => {
    calls++;
    return route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ status: 'fail', code: 'ERATE', message: 'ERATE, rate limit reached' }),
    });
  });

  await page.getByRole('tab', { name: 'Website URL' }).click();
  const address = page.getByLabel('Website address');

  await address.fill('localhost:3000');
  await page.getByRole('button', { name: 'Capture', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('public website address');
  expect(calls).toBe(0);

  await address.fill('example.com');
  await address.press('Enter');
  await expect(page.getByRole('alert')).toContainText('free capture limit');
  expect(calls).toBe(1);
});

test('phone layout keeps every tool without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await addFiles(page, [solid('a-long-file-name-from-a-phone-screenshot.png', 300, 900, [0, 0, 0]), solid('b.png', 300, 900, [9, 9, 9])]);
  await expect(items(page)).toHaveCount(2);

  const first = items(page).first();
  for (const title of ['Crop image', 'Rotate 90° Clockwise', 'Duplicate image', 'Remove from queue']) {
    await expect(first.getByTitle(title)).toBeVisible();
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
