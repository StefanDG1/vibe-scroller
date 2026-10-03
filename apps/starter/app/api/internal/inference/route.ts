import { getVercelOidcToken } from "@vercel/oidc";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import {
  inferenceBodyLimit,
  inferencePayload,
  inferenceDigest,
  verifyInference,
} from "../../../../../../packages/policy/inference-broker";
import {
  googleConfigured,
  googleAccessToken,
  googleGenerate,
} from "../../../../../../packages/providers/google-inference";
export const runtime = "nodejs";
export const maxDuration = 180;
export async function POST(request: Request) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  const denied = () =>
    Response.json(
      { error: "Inference unavailable." },
      { status: 403, headers },
    );
  if (
    !googleConfigured() ||
    request.headers.has("Origin") ||
    request.headers.get("Content-Type") !== "application/json"
  )
    return denied();
  try {
    const reader = request.body?.getReader();
    if (!reader) return denied();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > inferenceBodyLimit) return denied();
        chunks.push(next.value);
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    const raw = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
    if (
      Object.keys(raw).sort().join(",") !== "envelope,payload" ||
      typeof raw.envelope !== "string"
    )
      return denied();
    const signature = request.headers.get("X-Vibe-Signature") ?? "";
    const auth = await verifyInference(
      raw.envelope,
      signature,
      process.env.GOOGLE_INFERENCE_BRIDGE_SECRET ?? "",
    );
    const payload = inferencePayload.parse(raw.payload);
    if (
      !auth ||
      auth.maxMicros !== payload.maxMicros ||
      auth.payloadDigest !== (await inferenceDigest(JSON.stringify(payload))) ||
      !process.env.NEXT_PUBLIC_CONVEX_URL
    )
      return denied();
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    if (
      !(await client.mutation(api.googleInferenceBudget.consume, {
        envelope: raw.envelope,
        signature,
      }))
    )
      return denied();
    const token = await googleAccessToken(await getVercelOidcToken());
    return Response.json(
      await googleGenerate(
        payload,
        token,
        process.env.GOOGLE_INFERENCE_PROJECT_ID!,
      ),
      { headers },
    );
  } catch {
    return denied();
  }
}
