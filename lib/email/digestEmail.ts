import type { DigestResult } from "@/lib/digest/types";
import type { RenderedEmail } from "./emailTheme";
import { renderDigestHtml } from "./digestHtml";
import { renderDigestText } from "./digestText";

export function renderDigestEmail(result: DigestResult): RenderedEmail {
  return {
    subject: `🌅 morning - ${result.marketSentiment.label} sentiment`,
    html: renderDigestHtml(result),
    text: renderDigestText(result),
  };
}
