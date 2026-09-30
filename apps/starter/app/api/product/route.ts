import { NextRequest, NextResponse } from "next/server";
import { backend, api, configured } from "@/lib/backend";
import { withAuth } from "@workos-inc/authkit-nextjs";
const operations = {
  capture: ["mutation", api.product.capture],
  process: ["mutation", api.product.processSource],
  editSource: ["mutation", api.product.editSource],
  attachSource: ["mutation", api.product.attachSource],
  deleteSource: ["mutation", api.product.deleteSource],
  connectRepository: ["action", api.integrations.connectRepository],
  saveProfile: ["mutation", api.product.saveProfile],
  match: ["action", api.integrations.match],
  decide: ["mutation", api.product.decide],
  editPlan: ["mutation", api.product.editPlan],
  approve: ["mutation", api.jobs.approve],
  cancel: ["mutation", api.jobs.cancel],
  publish: ["action", api.integrations.publishRun],
  refreshPR: ["action", api.integrations.refreshPR],
  saveKey: ["action", api.integrations.saveKey],
  revoke: ["mutation", api.jobs.revoke],
  feedback: ["mutation", api.product.feedback],
  preferences: ["mutation", api.commerce.preferences],
  revokeDevice: ["mutation", api.devices.revoke],
} as const;
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  if (!configured())
    return NextResponse.json(
      { error: "Configure product identity and backend first." },
      { status: 503 },
    );
  const auth = await withAuth();
  if (!auth.user)
    return NextResponse.json(
      { error: "Sign in to continue." },
      { status: 401 },
    );
  if (Number(req.headers.get("content-length") ?? 0) > 150000)
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 150000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const { operation, args } = JSON.parse(raw);
    const entry = operations[operation as keyof typeof operations];
    if (!entry)
      return NextResponse.json(
        { error: "Unknown operation." },
        { status: 400 },
      );
    const c = await backend();
    const result =
      entry[0] === "action"
        ? await c.action(entry[1] as any, args)
        : await c.mutation(entry[1] as any, args);
    return NextResponse.json(
      { result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "The operation could not be completed. Check the current source, plan, allowance, and connection status before retrying.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
