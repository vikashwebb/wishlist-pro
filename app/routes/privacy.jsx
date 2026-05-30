import { privacyHtmlResponse } from "../utils/privacy-html.server";

/** Document route: loader returns HTML directly (no Shopify session / DB). */
export async function loader() {
  return privacyHtmlResponse();
}

export default function PrivacyDocument() {
  return null;
}
