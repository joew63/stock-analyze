import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runDailyScan } from "@/lib/digest/scan";
import { renderDigestEmail } from "@/lib/email/digestEmail";
import { sendDigestEmail } from "@/lib/email/gmail";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.DIGEST_CRON_SECRET;
  if (!expected) return false;
  const provided = req.headers.get("x-digest-secret") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";

  try {
    const result = await runDailyScan();
    const email = renderDigestEmail(result);

    if (dryRun) {
      return NextResponse.json({ dryRun: true, result, email });
    }

    await sendDigestEmail(email);
    return NextResponse.json({
      dryRun: false,
      sent: true,
      scannedAt: result.scannedAt,
      watchlistSize: result.watchlistSize,
      standoutCount: result.standouts.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Digest run failed." },
      { status: 500 }
    );
  }
}
