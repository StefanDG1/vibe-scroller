import { writeFile } from "node:fs/promises";
if (
  !process.env.RESEND_API_KEY ||
  !process.env.RESEND_FROM?.includes("@exponentialeducation.ro")
)
  throw Error("Dedicated sender configuration is required.");
const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
    "Idempotency-Key": "vibescroller-staging-synthetic-delivery-v1",
  },
  body: JSON.stringify({
    from: process.env.RESEND_FROM,
    to: "delivered@resend.dev",
    subject: "VibeScroller synthetic staging delivery test",
    text: "Synthetic integration test. No source, repository, credentials or customer content is included.",
  }),
});
const result = await response.json();
if (!response.ok || !result.id)
  throw Error(`Synthetic email request failed with HTTP ${response.status}.`);
const evidence = {
  time: new Date().toISOString(),
  emailId: result.id,
  requestAccepted: true,
  recipient: "official Resend simulation address",
  deliveryConfirmed: false,
  reference: "https://resend.dev/",
};
await writeFile(
  new URL("../infra/email-evidence.json", import.meta.url),
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence));
