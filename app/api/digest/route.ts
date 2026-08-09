import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runDailyScan } from "@/lib/digest/scan";
import { renderDigestEmail } from "@/lib/email/digestEmail";
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
