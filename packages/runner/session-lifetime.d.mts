export function sessionDeadline(lifetimeMs: number, now?: number): number;
export function waitForSessionExpiry<T>(
  expiresAt: number,
  stopped: Promise<T>,
  timeoutValue?: T,
): Promise<T | undefined>;
export function workerExpiryScript(expiresAt: number): string;
