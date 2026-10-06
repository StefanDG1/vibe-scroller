export const contentExportSections = [
  "improvements",
  "improvementOutcomes",
  "improvementPolicies",
  "improvementPreferences",
  "libraryScans",
  "subscriptionTrials",
  "localLibraryRuns",
  "localSourceImports",
  "sources",
  "proposals",
  "feedback",
  "repositories",
  "runs",
  "workspaceCategories",
  "knowledgeTopics",
  "knowledgeMembers",
  "knowledgeJobs",
  "knowledgeEvaluations",
  "knowledgePolicies",
  "issueDrafts",
  "issueAttempts",
] as const;
export type ContentExportSection = (typeof contentExportSections)[number];

const privateFields = new Set([
  "objectKey",
  "ciphertext",
  "signedUrl",
  "uploadUrl",
  "downloadUrl",
  "accessToken",
  "refreshToken",
  "credentialRevision",
  "planDraftKey",
  "profileDraftKey",
  "planDraftActor",
  "profileDraftActor",
  "inspected",
]);
const repositoryContext = new Set([
  "context",
  "contextTree",
  "contextExcerpts",
  "contextFiles",
  "snapshotDelta",
]);

// Content exports keep user decisions and provenance, not storage capabilities,
// authentication bindings, or a second copy of the temporary repository context.
export function exportRecord(
  section: ContentExportSection,
  value: unknown,
): unknown {
  const redact = (item: unknown, root = false): unknown => {
    if (Array.isArray(item)) return item.map((entry) => redact(entry));
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item)
          .filter(
            ([key]) =>
              !privateFields.has(key) &&
              !(
                root &&
                section === "repositories" &&
                repositoryContext.has(key)
              ) &&
              !(
                root &&
                section === "localSourceImports" &&
                ["transcript", "frames", "acquisition"].includes(key)
              ),
          )
          .map(([key, entry]) => [key, redact(entry)]),
      );
    return item;
  };
  return redact(value, true);
}
