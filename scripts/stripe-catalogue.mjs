import Stripe from "stripe";
import { readFile } from "node:fs/promises";
import {
  provisionCatalogue,
  validateProvisioningEnvironment,
} from "../packages/providers/stripe-catalogue.ts";
const pricing = JSON.parse(
  await readFile(new URL("../contracts/pricing.json", import.meta.url)),
);
const key = process.env.STRIPE_SECRET_KEY;
const mode = process.env.STRIPE_MODE ?? "test";
const account = process.env.STRIPE_ACCOUNT_ID;
validateProvisioningEnvironment(
  key,
  mode,
  account,
  process.argv.includes("--live"),
);
const client = new Stripe(key);
const result = await provisionCatalogue(client, pricing, account, mode);
for (const [name, value] of Object.entries(result.environment))
  console.log(`${name}=${value}`);
console.log(`STRIPE_READINESS=${JSON.stringify(result.readiness)}`);
