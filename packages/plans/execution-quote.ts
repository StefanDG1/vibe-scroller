// Advisory display only. Server authorization and atomic reservation remain authoritative.
export function availableProcessingCredits(
  pools: {
    granted: number;
    spent: number;
    reserved: number;
    expiresAt?: number;
  }[],
  now = Date.now(),
) {
  return pools.reduce((sum, pool) => {
    if (pool.expiresAt !== undefined && pool.expiresAt <= now) return sum;
    const amount = pool.granted - pool.spent - pool.reserved;
    return sum + (Number.isSafeInteger(amount) ? Math.max(0, amount) : 0);
  }, 0);
}
export function cloudExecutionEstimate(
  maximum: number,
  computeReservationCredits: number,
  creditsPerSecond: number,
) {
  if (
    !Number.isSafeInteger(maximum) ||
    maximum < 1 ||
    maximum > 10000 ||
    !Number.isSafeInteger(computeReservationCredits) ||
    computeReservationCredits < 1 ||
    !Number.isFinite(creditsPerSecond) ||
    creditsPerSecond <= 0
  )
    return null;
  const compute = Math.min(computeReservationCredits, maximum - 1);
  if (compute < Math.ceil(30 * creditsPerSecond)) return null;
  return {
    computeCredits: compute,
    inferenceCredits: maximum - compute,
    maximumSeconds: Math.min(1200, Math.floor(compute / creditsPerSecond)),
  };
}
