// Vercel Function mirroring the Express route in server.ts: full-page web
// capture needs a headless browser, which this deployment doesn't provide.
export function POST(): Response {
  return Response.json(
    { error: 'Web screenshots are not supported in this environment.', details: 'Puppeteer is unavailable.' },
    { status: 501 },
  );
}
