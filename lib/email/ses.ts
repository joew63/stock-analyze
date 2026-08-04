import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// No static AWS access keys here — relies on the Lambda's own IAM
// execution role having ses:SendEmail permission (see README).
export async function sendDigestEmail(params: {
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const region = process.env.DIGEST_AWS_REGION || "us-east-1";
  const sender = requiredEnv("DIGEST_SENDER_EMAIL");
  const recipient = requiredEnv("DIGEST_RECIPIENT_EMAIL");

  const client = new SESClient({ region });
  await client.send(
    new SendEmailCommand({
      Source: sender,
      Destination: { ToAddresses: [recipient] },
      Message: {
        Subject: { Data: params.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: params.html, Charset: "UTF-8" },
          Text: { Data: params.text, Charset: "UTF-8" },
        },
      },
    })
  );
}
