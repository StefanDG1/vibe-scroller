export const subscriptionConfig: string[];
export function checkTrialBundle<T>(bundle: T): T;
export function checkTrialResults(
  bundle: unknown,
  results: unknown,
): Array<{ warnings: string[] }>;
export function analyzeSubscriptionTrial(
  bundle: unknown,
  session: unknown,
  options: { claimAttempt: (sourceId: string) => Promise<unknown> },
): Promise<unknown>;
