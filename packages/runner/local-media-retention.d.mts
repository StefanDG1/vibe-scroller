export function purgeLocalPreparation(
  directory: string,
  now?: number,
): Promise<{ purged: true } | { purged: false; expiresAt: number }>;
