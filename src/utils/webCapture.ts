/**
 * Website capture without a server of our own: the visitor's browser asks
 * Microlink's free screenshot API (https://microlink.io) to render the page,
 * then downloads the PNG it returns. Nothing runs on our hosting, so captures
 * cost nothing against the Vercel allowance. The free tier is rate limited
 * (roughly 50 captures a day), which surfaces as a CaptureError below.
 */

export type ViewportDevice = 'desktop' | 'tablet' | 'mobile';
export type ColorScheme = 'light' | 'dark';

export const CAPTURE_API = 'https://api.microlink.io/';

export const VIEWPORTS: Record<ViewportDevice, { width: number; height: number; deviceScaleFactor: number; isMobile: boolean }> = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false },
  tablet: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
};

export class CaptureError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'CaptureError';
  }
}

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|0\.0\.0\.0|\[.*\])$/i;

/**
 * Accepts what people type ("example.com", "https://x.y/path") and returns a
 * full public http(s) URL, or null when it cannot be captured.
 */
export function normalizeCaptureUrl(input: string): string | null {
  let value = input.trim();
  if (!value) return null;
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(value)) value = `https://${value}`;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  // A remote renderer cannot reach private addresses, so fail fast with a clear message instead.
  if (!url.hostname.includes('.') || PRIVATE_HOST.test(url.hostname)) return null;
  return url.toString();
}

export function buildCaptureApiUrl(url: string, device: ViewportDevice, colorScheme: ColorScheme): string {
  const vp = VIEWPORTS[device];
  const params = new URLSearchParams({
    url,
    screenshot: 'true',
    meta: 'false',
    fullPage: 'true',
    type: 'png',
    colorScheme,
    'viewport.width': String(vp.width),
    'viewport.height': String(vp.height),
    'viewport.deviceScaleFactor': String(vp.deviceScaleFactor),
    'viewport.isMobile': String(vp.isMobile),
  });
  return `${CAPTURE_API}?${params}`;
}

interface MicrolinkResponse {
  status?: string;
  code?: string;
  message?: string;
  data?: { screenshot?: { url?: string } };
}

function describeFailure(status: number, body: MicrolinkResponse | null): CaptureError {
  const code = body?.code;
  if (status === 429 || code === 'ERATE') {
    return new CaptureError(
      'The free capture limit for today has been reached. Try again tomorrow, or take a screenshot yourself and paste it with Ctrl+V.',
      'ERATE'
    );
  }
  const detail = body?.message?.replace(/^E[A-Z]+,\s*/, '');
  return new CaptureError(detail || `The capture service answered with an error (${status}).`, code);
}

/** Captures a full-page screenshot of `url` and returns it as a PNG file. */
export async function captureWebsite(
  url: string,
  device: ViewportDevice,
  colorScheme: ColorScheme,
  options: { signal?: AbortSignal; onStatus?: (status: string) => void; fetchImpl?: typeof fetch } = {}
): Promise<File> {
  const doFetch = options.fetchImpl ?? fetch;
  const { signal, onStatus } = options;

  onStatus?.('Rendering the page…');
  let res: Response;
  try {
    res = await doFetch(buildCaptureApiUrl(url, device, colorScheme), { signal });
  } catch (err) {
    if (signal?.aborted) throw new CaptureError('The capture took too long and was cancelled.');
    throw new CaptureError('Could not reach the capture service. Check your connection and try again.');
  }

  let body: MicrolinkResponse | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || body?.status !== 'success') throw describeFailure(res.status, body);

  const imageUrl = body.data?.screenshot?.url;
  if (!imageUrl) throw new CaptureError('The capture service did not return a screenshot.');

  onStatus?.('Downloading the screenshot…');
  let image: Blob;
  try {
    const imgRes = await doFetch(imageUrl, { signal });
    if (!imgRes.ok) throw new Error(String(imgRes.status));
    image = await imgRes.blob();
  } catch {
    if (signal?.aborted) throw new CaptureError('The capture took too long and was cancelled.');
    throw new CaptureError('The screenshot was made but could not be downloaded. Please try again.');
  }

  const host = new URL(url).hostname.replace(/^www\./, '');
  return new File([image], `${host}-fullpage-${device}.png`, { type: image.type || 'image/png' });
}
