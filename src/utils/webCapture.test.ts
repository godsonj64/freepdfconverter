import { describe, expect, it, vi } from 'vitest';
import { buildCaptureApiUrl, captureWebsite, CaptureError, normalizeCaptureUrl } from './webCapture';

describe('normalizeCaptureUrl', () => {
  it('adds https:// to bare domains', () => {
    expect(normalizeCaptureUrl('example.com')).toBe('https://example.com/');
    expect(normalizeCaptureUrl('  news.ycombinator.com/news?p=2 ')).toBe('https://news.ycombinator.com/news?p=2');
  });

  it('keeps explicit http and https', () => {
    expect(normalizeCaptureUrl('http://example.com/a')).toBe('http://example.com/a');
  });

  it('rejects non-web schemes, junk and private hosts', () => {
    for (const bad of ['', 'ftp://example.com', 'javascript:alert(1)', 'not a url', 'localhost:3000', 'http://127.0.0.1', 'http://192.168.1.1', 'http://intranet']) {
      expect(normalizeCaptureUrl(bad), bad).toBeNull();
    }
  });
});

describe('buildCaptureApiUrl', () => {
  it('asks for a full-page PNG at the chosen viewport and colour scheme', () => {
    const api = new URL(buildCaptureApiUrl('https://example.com/', 'mobile', 'dark'));
    expect(api.origin).toBe('https://api.microlink.io');
    const p = api.searchParams;
    expect(p.get('url')).toBe('https://example.com/');
    expect(p.get('screenshot')).toBe('true');
    expect(p.get('fullPage')).toBe('true');
    expect(p.get('colorScheme')).toBe('dark');
    expect(p.get('viewport.width')).toBe('390');
    expect(p.get('viewport.isMobile')).toBe('true');
  });
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('captureWebsite', () => {
  it('downloads the screenshot and names it after the site', async () => {
    const png = new Uint8Array([137, 80, 78, 71]);
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('https://api.microlink.io/')) {
        return json(200, { status: 'success', data: { screenshot: { url: 'https://cdn.example/shot.png' } } });
      }
      return new Response(png, { status: 200, headers: { 'content-type': 'image/png' } });
    });

    const file = await captureWebsite('https://www.example.com/', 'desktop', 'light', { fetchImpl: fetchImpl as typeof fetch });
    expect(file.name).toBe('example.com-fullpage-desktop.png');
    expect(file.type).toBe('image/png');
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(png);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('explains the daily limit when rate limited', async () => {
    const fetchImpl = vi.fn(async () => json(429, { status: 'fail', code: 'ERATE', message: 'ERATE, rate limit' }));
    const err = await captureWebsite('https://example.com/', 'desktop', 'light', { fetchImpl: fetchImpl as typeof fetch }).catch((e) => e);
    expect(err).toBeInstanceOf(CaptureError);
    expect(err.code).toBe('ERATE');
    expect(err.message).toMatch(/limit/i);
  });

  it('passes on the service error message', async () => {
    const fetchImpl = vi.fn(async () =>
      json(400, { status: 'fail', code: 'EINVALURL', message: 'EINVALURL, The url is not reachable.' })
    );
    await expect(
      captureWebsite('https://example.com/', 'desktop', 'light', { fetchImpl: fetchImpl as typeof fetch })
    ).rejects.toThrow('The url is not reachable.');
  });

  it('reports network failures in plain words', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(
      captureWebsite('https://example.com/', 'desktop', 'light', { fetchImpl: fetchImpl as typeof fetch })
    ).rejects.toThrow(/could not reach the capture service/i);
  });
});
