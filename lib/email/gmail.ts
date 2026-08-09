import nodemailer from "nodemailer";
import { getSsmParameter } from "@/lib/ssm";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// The App Password is a real secret (unlike the sender/recipient
// addresses), so it's kept out of the build-time env entirely and fetched
// at request time from SSM Parameter Store via the Lambda's own IAM role —
// no access keys, same "no static credentials" approach the old SES setup
// used. See README for how to create the parameter and grant read access.
async function getAppPassword(): Promise<string> {
  const name = requiredEnv("DIGEST_GMAIL_APP_PASSWORD_PARAM");
  const region = process.env.DIGEST_AWS_REGION || "us-east-1";
  return getSsmParameter(name, region);
}

// Sends through Gmail's own SMTP servers (as the account owner) rather than
// a third party like SES, so SPF/DKIM/DMARC are naturally aligned to
// gmail.com — no domain to buy or verify, and no spoofing signal for
// Gmail's spam filter to flag.
export async function sendDigestEmail(params: {
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const user = requiredEnv("DIGEST_GMAIL_USER");
  const recipient = requiredEnv("DIGEST_RECIPIENT_EMAIL");
  const pass = await getAppPassword();

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  await transport.sendMail({
    from: user,
    to: recipient,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}
