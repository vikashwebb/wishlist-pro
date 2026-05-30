import { buildPrivacyHtml } from "../scripts/privacy-html-content.mjs";

/**
 * Vercel serverless handler for /privacy.
 * Served via vercel.json rewrite — does NOT go through React Router SSR.
 */
export default function handler() {
  const html = buildPrivacyHtml(process.env.SUPPORT_EMAIL || "");

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
