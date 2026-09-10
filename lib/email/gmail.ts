import nodemailer from "nodemailer";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// The App Password is a real secret (unlike the sender/recipient
// addresses). It's injected from the GitHub Actions secret store into the
// job's env at run time and never written to disk. See README for how to
// create the App Password and register it as a repo secret.
function getAppPassword(): string {
  return requiredEnv("DIGEST_GMAIL_APP_PASSWORD");
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
  const pass = getAppPassword();

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
