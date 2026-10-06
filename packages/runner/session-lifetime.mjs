export function sessionDeadline(lifetimeMs, now = Date.now()) {
  if (
    !Number.isSafeInteger(lifetimeMs) ||
    lifetimeMs <= 0 ||
    lifetimeMs > 4 * 3600000 ||
    !Number.isSafeInteger(now) ||
    now < 0
  )
    throw Error("SUBSCRIPTION_SESSION_LIFETIME_INVALID");
  return now + lifetimeMs;
}

export async function waitForSessionExpiry(expiresAt, stopped, timeoutValue) {
  let timer;
  try {
    return await Promise.race([
      new Promise((resolve) => {
        // Cleanup must still run after the official sign-in client exits.
        timer = setTimeout(
          () => resolve(timeoutValue),
          Math.max(0, expiresAt - Date.now()),
        );
      }),
      stopped,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function workerExpiryScript(expiresAt) {
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= 0)
    throw Error("SUBSCRIPTION_SESSION_LIFETIME_INVALID");
  return `setTimeout(()=>process.exit(0),Math.max(0,${expiresAt}-Date.now()))`;
}
