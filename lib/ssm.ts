import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

// Cached across warm Lambda invocations so we're not calling SSM on every
// request — these values don't change without a redeploy anyway.
const cache = new Map<string, string>();

export async function getSsmParameter(name: string, region: string): Promise<string> {
  const cached = cache.get(name);
  if (cached) return cached;

  const client = new SSMClient({ region });
  const { Parameter } = await client.send(
    new GetParameterCommand({ Name: name, WithDecryption: true })
  );
  if (!Parameter?.Value) throw new Error(`SSM parameter ${name} has no value`);

  cache.set(name, Parameter.Value);
  return Parameter.Value;
}
