import { runDailyScan } from "@/lib/digest/scan";
import { runMiddayScan } from "@/lib/digest/midday";
import { renderDigestEmail } from "@/lib/email/digestEmail";
import { renderMiddayEmail } from "@/lib/email/middayEmail";
import { sendDigestEmail } from "@/lib/email/gmail";

type Mode = "daily" | "midday";

interface Options {
  mode: Mode;
  dryRun: boolean;
  expectHour: number | null;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { mode: "daily", dryRun: false, expectHour: null };
  for (const arg of argv) {
    if (arg === "--midday" || arg === "--mode=midday") opts.mode = "midday";
    else if (arg === "--mode=daily") opts.mode = "daily";
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg.startsWith("--expect-hour=")) {
      opts.expectHour = Number(arg.slice("--expect-hour=".length));
    }
  }
  return opts;
}

// GitHub Actions cron has no timezone support, so each scheduled job fires at
// both the EST and EDT UTC equivalents of the target Eastern time. This guard
// lets only the run that lands on the intended Eastern hour proceed; the other
// exits as a no-op. Manual runs (workflow_dispatch) pass no --expect-hour and
// skip the guard entirely.
function easternHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
}

async function main(): Promise<void> {
  const { mode, dryRun, expectHour } = parseArgs(process.argv.slice(2));

  if (expectHour !== null) {
    const hour = easternHour();
    if (hour !== expectHour) {
      console.log(
        `Eastern hour is ${hour}, expected ${expectHour} — skipping this run.`
      );
      return;
    }
  }

  console.log(`Running ${mode} digest${dryRun ? " (dry run)" : ""}...`);

  const email =
    mode === "midday"
      ? renderMiddayEmail(await runMiddayScan())
      : renderDigestEmail(await runDailyScan());

  if (dryRun) {
    console.log(email.subject);
    console.log("\n" + email.text);
    return;
  }

  await sendDigestEmail(email);
  console.log(`Sent: ${email.subject}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
