// Product telemetry is a closed vocabulary. Source and account data never enter it.
const views = [
  "home",
  "library",
  "projects",
  "source",
  "proposal",
  "proposals",
  "runs",
  "usage",
  "connections",
  "runners",
  "privacy",
  "billing",
  "plans",
  "menu",
];
const events: Record<string, Record<string, readonly string[] | "count">> = {
  page_viewed: {
    surface: ["website", "app"],
    page: [
      "home",
      "pricing",
      "how_it_works",
      "docs",
      "faq",
      "legal",
      "account",
      "app",
      "other",
    ],
  },
  workspace_viewed: { view: views },
  source_viewed: {
    kind: ["url", "upload", "text"],
    state: [
      "saved",
      "queued",
      "processing",
      "ready",
      "failed",
      "needs_upload",
      "deleted",
    ],
    coverage: [
      "metadata_only",
      "caption_only",
      "audio_only",
      "visual_only",
      "full_sampled",
    ],
  },
  source_captured: { kind: ["url", "upload", "text"] },
  import_previewed: { count: "count", format: ["zip", "json", "html", "csv"] },
  import_completed: {
    accepted: "count",
    duplicates: "count",
    waiting: "count",
  },
  analysis_approved: { route: ["personal_chatgpt", "included", "byo"] },
  analysis_completed: {
    route: ["personal_chatgpt", "included", "byo"],
    coverage: ["caption_only", "audio_only", "visual_only", "full_sampled"],
  },
  analysis_canceled: {},
  source_deleted: {},
  repository_connected: {},
  proposal_reviewed: { decision: ["accepted", "rejected", "deferred"] },
  plan_saved: {},
  execution_approved: { route: ["local", "cloud"] },
  draft_pr_created: {},
  pr_reconciled: {},
  operation_failed: {
    operation: [
      "capture",
      "importLinks",
      "process",
      "approvePersonalAnalysis",
      "match",
      "draftPlan",
      "approve",
      "publish",
      "refreshPR",
      "connectRepository",
    ],
    code: [
      "ORIGIN_DENIED",
      "REAUTH_REQUIRED",
      "FORBIDDEN",
      "BUDGET_EXCEEDED",
      "PROVIDER_UNAVAILABLE",
      "UNKNOWN",
    ],
  },
};
export function safeAnalyticsEvent(
  name: string,
  raw: Record<string, unknown> = {},
) {
  const fields = events[name];
  if (!fields) return null;
  const properties: Record<string, string | number> = { schema_version: "1" };
  for (const [key, allowed] of Object.entries(fields)) {
    const value = raw[key];
    if (allowed === "count") {
      if (
        typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0
      )
        properties[key] = Math.min(value, 1000);
    } else if (typeof value === "string" && allowed.includes(value))
      properties[key] = value;
  }
  return { event: name, properties };
}
export function productAnalyticsEvent(
  operation: string,
  args: any,
  result: any,
) {
  const names: Record<string, string> = {
    capture: "source_captured",
    importLinks: "import_completed",
    process: "analysis_approved",
    approvePersonalAnalysis: "analysis_approved",
    cancelPersonalAnalysis: "analysis_canceled",
    deleteSource: "source_deleted",
    connectRepository: "repository_connected",
    decide: "proposal_reviewed",
    editPlan: "plan_saved",
    approve: "execution_approved",
    publish: "draft_pr_created",
    refreshPR: "pr_reconciled",
  };
  const name = names[operation];
  return name
    ? safeAnalyticsEvent(name, {
        kind: args.kind,
        decision: args.decision,
        route:
          operation === "approvePersonalAnalysis"
            ? "personal_chatgpt"
            : operation === "process"
              ? "included"
              : args.executor,
        accepted: result?.accepted,
        duplicates: result?.duplicates,
        waiting: result?.waiting,
      })
    : null;
}

export function publicPageEvent(pathname: string) {
  if (/^\/(demo|callback|sign-in|sign-up|share)(?:\/|$)/.test(pathname))
    return null;
  const pages: Record<string, string> = {
    "/": "home",
    "/pricing": "pricing",
    "/how-it-works": "how_it_works",
    "/docs": "docs",
    "/faq": "faq",
    "/account": "account",
  };
  const legal = [
    "privacy",
    "terms",
    "cookies",
    "refunds",
    "acceptable-use",
    "copyright",
    "legal",
    "subprocessors",
    "dpa",
  ];
  return safeAnalyticsEvent("page_viewed", {
    surface: pathname.startsWith("/app") ? "app" : "website",
    page: pathname.startsWith("/app")
      ? "app"
      : (pages[pathname] ??
        (legal.includes(pathname.slice(1)) ? "legal" : "other")),
  });
}
