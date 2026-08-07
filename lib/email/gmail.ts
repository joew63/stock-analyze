import nodemailer from "nodemailer";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Cached across warm Lambda invocations so we're not calling SSM on every
// request — the app password doesn't change without a redeploy anyway.
let cachedAppPassword: string | null = null;

// The App Password is a real secret (unlike the sender/recipient
// addresses), so it's kept out of the build-time env entirely and fetched
// at request time from SSM Parameter Store via the Lambda's own IAM role —
// no access keys, same "no static credentials" approach the old SES setup
// used. See README for how to create the parameter and grant read access.
async function getAppPassword(): Promise<string> {
  if (cachedAppPassword) return cachedAppPassword;
  const name = requiredEnv("DIGEST_GMAIL_APP_PASSWORD_PARAM");
  const region = process.env.DIGEST_AWS_REGION || "us-east-1";
  const client = new SSMClient({ region });
  const { Parameter } = await client.send(
    new GetParameterCommand({ Name: name, WithDecryption: true })
  );
  if (!Parameter?.Value) throw new Error(`SSM parameter ${name} has no value`);
  cachedAppPassword = Parameter.Value;
  return cachedAppPassword;
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
