import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runDailyScan } from "@/lib/digest/scan";
import { runMiddayScan } from "@/lib/digest/midday";
import { renderDigestEmail } from "@/lib/email/digestEmail";
import { renderMiddayEmail } from "@/lib/email/middayEmail";
import { sendDigestEmail } from "@/lib/email/gmail";
import { getSsmParameter } from "@/lib/ssm";

// The cron secret is a real secret (it's what authenticates this endpoint),
// so like the Gmail App Password it's kept out of the build-time env and
// fetched at request time from SSM Parameter Store via the Lambda's own IAM
// role — only the parameter *name* (DIGEST_CRON_SECRET_PARAM) is a build-time
// env var. See README for how to create the parameter and grant read access.
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const paramName = process.env.DIGEST_CRON_SECRET_PARAM;
  if (!paramName) return false;
  const region = process.env.DIGEST_AWS_REGION || "us-east-1";
  const expected = await getSsmParameter(paramName, region);
  const provided = req.headers.get("x-digest-secret") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";
  // ?mode=midday runs the lighter intraday update (live quotes only, no
  // fundamentals/RSI). Anything else — including no param — is the full
  // daily digest, so the existing morning schedule keeps working untouched.
  const mode = req.nextUrl.searchParams.get("mode") === "midday" ? "midday" : "daily";

  try {
    if (mode === "midday") {
      const result = await runMiddayScan();
      const email = renderMiddayEmail(result);

      if (dryRun) {
        return NextResponse.json({ mode, dryRun: true, result, email });
      }

      await sendDigestEmail(email);
      return NextResponse.json({
        mode,
        dryRun: false,
        sent: true,
        scannedAt: result.scannedAt,
        watchlistSize: result.watchlistSize,
        quotedCount: result.quotedCount,
        pulse: result.pulse.label,
      });
    }

    const result = await runDailyScan();
    const email = renderDigestEmail(result);

    if (dryRun) {
      return NextResponse.json({ mode, dryRun: true, result, email });
    }

    await sendDigestEmail(email);
    return NextResponse.json({
      mode,
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
