export function triageDependencyAudit(
  audit: unknown,
  mitigations: unknown,
  readPatch: (path: string) => Buffer,
  now?: number,
): {
  passed: boolean;
  registryCounts: Record<string, number>;
  locallyMitigated: { advisory: string; module: string; severity: string }[];
  unresolved: { advisory: string; module: string; severity: string }[];
};
