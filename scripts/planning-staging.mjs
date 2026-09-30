import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
if (
  process.env.VIBE_STAGING_TEST !== "planning" ||
  process.env.CONVEX_DEPLOYMENT !== "dev:resolute-ladybug-999"
)
  throw Error("Explicit dedicated staging test required.");
const org = "kx73ewf64rjn1w8y3g7dtn31bn8fd16p";
const sourceId = "mx79ca9f0c2cct8d7dhx4p0v198fcpfy";
const cli = (args) =>
  execFileSync(process.execPath, ["node_modules/convex/bin/main.js", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 180000,
    maxBuffer: 10000000,
  });
const inline = (query) => JSON.parse(cli(["run", "--inline-query", query]));
const evidence = {
  observedAt: new Date().toISOString(),
  environment:
    "dedicated staging, administrator CLI test identity for the existing owner",
  browserJourneyTested: false,
  labeledOwnedSourceId: sourceId,
  selectionPassed: false,
  profileDraftPassed: false,
  planDraftPassed: false,
  noExecutionOrPublication: true,
};
if (existsSync("infra/planning-staging-evidence.json")) {
  const prior = JSON.parse(
    readFileSync("infra/planning-staging-evidence.json", "utf8"),
  );
  evidence.previousAttempts = [
    ...(prior.previousAttempts ?? []),
    {
      observedAt: prior.observedAt,
      failureStage: prior.failureStage ?? null,
      failureCategory: prior.failureCategory ?? null,
      selectionPassed: prior.selectionPassed,
      profileDraftPassed: prior.profileDraftPassed,
      planDraftPassed: prior.planDraftPassed,
    },
  ];
}
let stage = "authorize_staging";
try {
  const context = inline(
    `const source = await ctx.db.get(${JSON.stringify(sourceId)}); const membership = await ctx.db.query("memberships").withIndex("by_org", q => q.eq("organizationId", ${JSON.stringify(org)})).filter(q => q.eq(q.field("role"), "owner")).first(); const actor = membership && await ctx.db.get(membership.userId); const repo = await ctx.db.query("repositories").withIndex("by_org", q => q.eq("organizationId", ${JSON.stringify(org)})).filter(q => q.eq(q.field("enabled"), true)).first(); return { source: source && { title: source.title, state: source.state, organizationId: source.organizationId, insightId: source.analysis?.insights?.[0]?.id }, subject: actor?.subject, repositoryId: repo?._id };`,
  );
  if (
    !context.subject ||
    context.source?.organizationId !== org ||
    context.source.state !== "ready" ||
    !/synthetic|owned|staging/i.test(context.source.title) ||
    !context.source.insightId ||
    !context.repositoryId
  )
    throw Error("Labeled owned staging data unavailable.");
  const identity = JSON.stringify({ subject: context.subject });
  const call = (name, args) =>
    cli(["run", name, JSON.stringify(args), "--identity", identity]);
  stage = "selection";
  call("integrations:suggestRepositories", {
    id: sourceId,
    insightId: context.source.insightId,
    maxCredits: 10,
  });
  const selected = inline(
    `const s = await ctx.db.get(${JSON.stringify(sourceId)});return { count:s?.repositorySelection?.candidates?.length, noFitReason: !!s?.repositorySelection?.noFitReason, pending: !!s?.selectionPendingKey };`,
  );
  if (
    selected.pending ||
    !Number.isInteger(selected.count) ||
    selected.count > 5 ||
    (selected.count === 0 && !selected.noFitReason)
  )
    throw Error("Selection output unavailable.");
  evidence.selectionPassed = true;
  evidence.selectionCount = selected.count;
  stage = "profile_draft";
  call("integrations:draftProfile", {
    id: context.repositoryId,
    maxCredits: 10,
  });
  const profile = inline(
    `const r = await ctx.db.get(${JSON.stringify(context.repositoryId)});return { draftExists:!!r?.profileDraft, pending:!!r?.profileDraftKey, confirmed:r?.confirmed };`,
  );
  if (!profile.draftExists || profile.pending)
    throw Error("Profile draft unavailable.");
  evidence.profileDraftPassed = true;
  evidence.savedProfileConfirmationPreserved = profile.confirmed;
  stage = "matching";
  call("integrations:match", {
    id: sourceId,
    repositoryId: context.repositoryId,
    maxCredits: 10,
  });
  const proposal = inline(
    `const rows = await ctx.db.query("proposals").withIndex("by_source", q => q.eq("sourceId", ${JSON.stringify(sourceId)})).collect();const repo = await ctx.db.get(${JSON.stringify(context.repositoryId)});const p = rows.find(p => p.repositoryId===repo?._id && p.baseSha===repo.sha && p.profileVersion===repo.profileVersion);return p && {id:p._id,version:p.version,disposition:p.disposition};`,
  );
  if (!proposal) throw Error("Current proposal unavailable.");
  evidence.matchDisposition = proposal.disposition;
  if (proposal.disposition === "relevant") {
    stage = "plan_draft";
    call("product:decide", {
      id: proposal.id,
      version: proposal.version,
      decision: "accepted",
      note: "Owner-authorized synthetic staging verification; no execution approval.",
    });
    call("integrations:draftPlan", {
      id: proposal.id,
      version: proposal.version,
      maxCredits: 10,
    });
    const plan = inline(
      `const p = await ctx.db.get(${JSON.stringify(proposal.id)});return {draftExists:!!p?.planDraft,pending:!!p?.planDraftKey,savedPlanExists:!!p?.plan,version:p?.version};`,
    );
    if (!plan.draftExists || plan.pending)
      throw Error("Plan draft unavailable.");
    evidence.planDraftPassed = true;
    evidence.planAutomaticallySaved = plan.savedPlanExists;
  } else
    evidence.planDraftSkipped =
      "Actual matching did not produce a relevant proposal; no reviewer correction forced acceptance.";
  writeFileSync(
    "infra/planning-staging-evidence.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      selectionPassed: evidence.selectionPassed,
      profileDraftPassed: evidence.profileDraftPassed,
      matchDisposition: evidence.matchDisposition,
      planDraftPassed: evidence.planDraftPassed,
    }),
  );
} catch (error) {
  evidence.failureStage = stage;
  const diagnostics = String(error?.stderr ?? "");
  evidence.failureCategory =
    [
      "GITHUB_UNAVAILABLE",
      "FORBIDDEN",
      "PROVIDER_LIMIT",
      "PROVIDER_ERROR",
      "SETUP_REQUIRED",
      "QUOTE_CHANGED",
      "CONTEXT_REQUIRED",
      "SOURCE_BUSY",
      "INVALID_EVIDENCE",
    ].find((code) => diagnostics.includes(`${code}:`)) ?? "unclassified";
  writeFileSync(
    "infra/planning-staging-evidence.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.error(
    JSON.stringify({
      stagingPassed: false,
      stage,
      category: evidence.failureCategory,
    }),
  );
  process.exitCode = 1;
}
