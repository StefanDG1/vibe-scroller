export function freeWorkersConfigured(config = process.env, now = Date.now()) {
  const verified = Date.parse(config.CLOUDFLARE_FREE_PLAN_VERIFIED_AT ?? "");
  return !!(
    config.CLOUDFLARE_AI_TOKEN &&
    config.CLOUDFLARE_ACCOUNT_ID &&
    Number.isFinite(verified) &&
    verified <= now &&
    now - verified < 86400000
  );
}
