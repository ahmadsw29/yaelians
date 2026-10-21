import Whop from "@whop/sdk";
import { z } from "zod";

let clientPromise: Promise<Whop> | null = null;
async function initWhopClient() {
  const host = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL ? `depl ${process.env.WEB_REPL_RENEWAL}` : null;
  if (!host || !token) throw new Error("Whop connection unavailable");
  const response = await fetch(`https://${host}/api/v2/connection?include_secrets=true&connector_names=whop`, {
    headers: { Accept: "application/json", X_REPLIT_TOKEN: token },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Whop connection unavailable");
  const connection = z.object({ items: z.array(z.object({
    settings: z.object({ api_key: z.string() }),
  })) }).parse(await response.json());
  const key = connection.items?.[0]?.settings?.api_key;
  if (!key) throw new Error("Whop connection unavailable");
  // Match the company's v1 contract: newer API versions rename company to
  // account, including payment filters and membership ownership fields.
  return new Whop({ apiKey: key, version: "2025-01-01", timeout: 10_000, maxRetries: 1 });
}
export function getWhopClient() {
  return clientPromise ??= initWhopClient().catch(error => { clientPromise = null; throw error; });
}
