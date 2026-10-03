import { NextRequest, NextResponse } from "next/server";
import { backend, api, configured } from "@/lib/backend";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { allowedRequestOrigin } from "@/lib/request-origin";
const operations = {
  knowledgeList: ["query", api.knowledge.list],
  knowledgeDetail: ["query", api.knowledge.detail],
  knowledgePolicy: ["query", api.knowledge.policy],
  knowledgeIdeas: ["query", api.knowledge.evaluations],
  knowledgeConfigure: ["mutation", api.knowledge.configure],
  knowledgeCorrect: ["mutation", api.knowledge.correct],
  knowledgeEvaluate: ["mutation", api.knowledge.startEvaluation],
  knowledgeDecide: ["mutation", api.knowledge.decide],
  issueList: ["query", api.issues.list],
  issueCreate: ["mutation", api.issues.create],
  issueEdit: ["mutation", api.issues.edit],
  issuePrepare: ["action", api.issueActions.prepare],
  issuePublish: ["action", api.issueActions.publish],
  issueRefresh: ["action", api.issueActions.refresh],
  selectRepositories: ["action", api.integrations.selectRepositories],
  refreshGithubChoices: ["action", api.githubOAuth.refreshChoices],
  confirmProfile: ["mutation", api.profiles.confirmDraft],
  capture: ["mutation", api.product.capture],
  importLinks: ["mutation", api.imports.links],
  process: ["mutation", api.product.processSource],
  processBatch: ["mutation", api.product.processBatch],
  editSource: ["mutation", api.product.editSource],
  attachSource: ["mutation", api.product.attachSource],
  deleteSource: ["mutation", api.product.deleteSource],
  assignCategories: ["mutation", api.categories.assign],
  suggestCategory: ["mutation", api.categories.suggest],
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
  reviewAnalysis: ["mutation", api.product.reviewAnalysis],
  preferences: ["mutation", api.commerce.preferences],
  aiPreference: ["mutation", api.aiPreferences.save],
  revokeDevice: ["mutation", api.devices.revoke],
  startDevice: ["mutation", api.devices.start],
  approveDevice: ["mutation", api.devices.approve],
  approvePersonalAnalysis: ["mutation", api.personalAnalysis.approve],
  approvePersonalBatch: ["mutation", api.personalAnalysis.approveBatch],
  checkPersonalSession: ["query", api.personalAnalysis.checkSession],
  cancelPersonalAnalysis: ["mutation", api.personalAnalysis.cancel],
} as const;
export async function POST(req: NextRequest) {
  if (!allowedRequestOrigin(req))
    return NextResponse.json(
      { error: "Request origin is not allowed.", code: "ORIGIN_DENIED" },
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
  let operationName = "unvalidated";
  let stage = "read_body";
  let bodyBytes: number | undefined;
  try {
    const raw = await req.text();
    bodyBytes = new TextEncoder().encode(raw).length;
    if (new TextEncoder().encode(raw).length > 150000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    stage = "parse_body";
    const { operation, args } = JSON.parse(raw);
    const entry = operations[operation as keyof typeof operations];
    if (!entry)
      return NextResponse.json(
        { error: "Unknown operation." },
        { status: 400 },
      );
    operationName = operation;
    stage = "backend";
    const c = await backend(auth);
    const result =
      entry[0] === "action"
        ? await c.action(entry[1] as any, args)
        : entry[0] === "query"
          ? await c.query(entry[1] as any, args)
          : await c.mutation(entry[1] as any, args);
    return NextResponse.json(
      { result: result ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const messages: Record<string, string> = {
      ISSUES_PERMISSION_REQUIRED:
        "GitHub refused issue access. Ask the App and installation owner to approve Issues permission, then verify again. Your Markdown remains available; no issue was published.",
      PUBLICATION_UNKNOWN:
        "GitHub may have created this issue. Refresh its stored attempt to reconcile; no blind retry is allowed.",
      DUPLICATE_ISSUE:
        "This idea already has an issue draft. Review the existing draft or explicitly choose a follow-up.",
      POLICY_BLOCKED:
        "This action is paused or its text failed privacy/security checks. Review the current setup and permitted text.",
      REPOSITORY_LIMIT:
        "This selection exceeds the existing repository allowance. Choose fewer projects.",
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
        "The selected inference budget is reserved or exhausted. Review connection and usage before retrying; no funding fallback was used.",
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
      RIGHTS_REQUIRED:
        "Confirm that you may save and process this content before continuing.",
      UPLOAD_REQUIRED:
        "The link downloader is not available for this source. Your saved link remains available; attach permitted media or retry after setup.",
      UNSUPPORTED_SOURCE:
        "Use a single supported video or post link. This source format cannot be retrieved automatically.",
      MEDIA_UNAVAILABLE:
        "The isolated media worker is unavailable. Your source is saved; no alternative provider was used.",
      INVALID_INPUT:
        "Some submitted fields are invalid. Review the source and try again.",
      REAUTH_REQUIRED:
        "Sign in again before changing a sensitive connection. Your library has been kept.",
    };
    const data =
      error &&
      typeof error === "object" &&
      "data" in error &&
      typeof error.data === "string"
        ? error.data
        : "";
    const message = data || (error instanceof Error ? error.message : "");
    const category =
      error instanceof Error
        ? message.includes(
            "Sign in again before changing a sensitive connection.",
          )
          ? "REAUTH_REQUIRED"
          : Object.keys(messages).find((code) => message.includes(`${code}:`))
        : undefined;
    // Do not log payloads, source text, credentials, tokens or upstream errors.
    console.error("product_operation_failed", {
      operation: operationName,
      category: category ?? "UNCLASSIFIED",
      stage,
      bodyBytes,
      errorType:
        error instanceof SyntaxError
          ? "SyntaxError"
          : error instanceof TypeError
            ? "TypeError"
            : "Error",
    });
    return NextResponse.json(
      {
        error: category
          ? messages[category]
          : "The operation could not be completed. Check the current source, plan, allowance, and connection status before retrying.",
        code: category ?? "UNCLASSIFIED",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
