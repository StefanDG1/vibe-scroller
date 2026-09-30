export function validateJob(
  envelope: unknown,
  config: { workspaceId: string },
  evidenceHash: string,
): any;
export function executeJob(options: Record<string, any>): Promise<void>;
