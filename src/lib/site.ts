/**
 * Canonical site URL. Set NEXT_PUBLIC_SITE_URL in Vercel; preview deployments fall back to the
 * Vercel-provided host, and local development to localhost.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
