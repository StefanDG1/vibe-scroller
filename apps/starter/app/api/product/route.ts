import { NextRequest, NextResponse } from "next/server";
import { backend, api, configured } from "@/lib/backend";
import { withAuth } from "@workos-inc/authkit-nextjs";
const operations = {
  capture: ["mutation", api.product.capture],
  importLinks: ["mutation", api.imports.links],
  process: ["mutation", api.product.processSource],
  editSource: ["mutation", api.product.editSource],
  attachSource: ["mutation", api.product.attachSource],
  deleteSource: ["mutation", api.product.deleteSource],
  connectRepository: ["action", api.integrations.connectRepository],
  saveProfile: ["mutation", api.product.saveProfile],
  draftProfile: ["action", api.integrations.draftProfile],
  match: ["action", api.integrations.match],
  suggestRepositories: ["action", api.integrations.suggestRepositories],
  draftPlan: ["action", api.integrations.draftPlan],
  decide: ["mutation", api.product.decide],
  editPlan: ["mutation", api.product.editPlan],
  approve: ["mutation", api.jobs.approve],
  cancel: ["mutation", api.jobs.cancel],
  publish: ["action", api.integrations.publishRun],
  refreshPR: ["action", api.integrations.refreshPR],
  saveKey: ["action", api.integrations.saveKey],
  testKey: ["action", api.integrations.testKey],
  revoke: ["mutation", api.jobs.revoke],
  feedback: ["mutation", api.product.feedback],
  preferences: ["mutation", api.commerce.preferences],
  aiPreference: ["mutation", api.aiPreferences.save],
  revokeDevice: ["mutation", api.devices.revoke],
  startDevice: ["mutation", api.devices.start],
  approveDevice: ["mutation", api.devices.approve],
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
    const c = await backend(auth);
    const result =
      entry[0] === "action"
        ? await c.action(entry[1] as any, args)
        : await c.mutation(entry[1] as any, args);
    return NextResponse.json(
      { result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const messages: Record<string, string> = {
      GITHUB_UNAVAILABLE:
        "GitHub access is unavailable or expired. Reconnect the selected GitHub account before continuing.",
      PROVIDER_ERROR:
        "The selected provider failed or refused the request. Check its connection; no funding fallback was used.",
      SETUP_REQUIRED:
        "This provider or model needs verified setup before this action is available.",
      CONTEXT_REQUIRED:
        "This action needs a ready source, supported main point or refreshed repository evidence.",
      SOURCE_BUSY:
        "This operation is already pending. Review its state before retrying; uncertain usage needs reconciliation.",
      QUOTE_CHANGED:
        "The model, price or scope changed. Review its current quote before approving.",
      COST_RECONCILIATION_REQUIRED:
        "Provider usage is uncertain or exceeded its approved ceiling. No automatic retry was issued.",
      PROVIDER_LIMIT:
        "The verified free inference allowance is reserved or exhausted. Try after it resets; no paid provider was used.",
      INSUFFICIENT_CREDITS:
        "The available allowance cannot cover this reservation. Review usage and the maximum budget.",
      QUOTA_EXCEEDED:
        "This workspace has reached its source or repository allowance.",
      BASE_CHANGED:
        "The repository changed. Refresh its snapshot and review a new plan.",
      APPROVAL_STALE:
        "This plan or request is stale. Review its current version before continuing.",
      MATCH_IN_PROGRESS:
        "Matching is already running for this source and repository.",
      RETRY_EXHAUSTED:
        "This matching job reached its retry limit. Review the source and provider setup before creating a new attempt.",
      ISOLATION_UNAVAILABLE:
        "The selected executor has not passed the required isolation checks.",
      FORBIDDEN:
        "This action is unavailable with your current workspace or repository access.",
    };
    const category =
      error instanceof Error
        ? Object.keys(messages).find((code) =>
            error.message.includes(`${code}:`),
          )
        : undefined;
    return NextResponse.json(
      {
        error: category
          ? messages[category]
          : "The operation could not be completed. Check the current source, plan, allowance, and connection status before retrying.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
