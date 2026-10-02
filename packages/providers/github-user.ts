import { z } from "zod";
import { ensure } from "../policy";
const credential = z.strictObject({
  version: z.literal(1),
  accessToken: z.string().min(10).max(500),
  githubUserId: z.number().int().positive(),
  accessExpiresAt: z.number().positive().optional(),
  refreshToken: z.string().min(10).max(500).optional(),
  refreshExpiresAt: z.number().positive().optional(),
});
export type GitHubUserCredential = z.infer<typeof credential>;
export function decodeGitHubCredential(
  value: string,
): GitHubUserCredential | { accessToken: string } {
  // Earlier encrypted rows contained only a bare access token.
  if (!value.startsWith("{")) {
    ensure(
      value.length >= 10 && value.length <= 500,
      "RECONNECT_REQUIRED",
      "Reconnect GitHub.",
    );
    return { accessToken: value };
  }
  return credential.parse(JSON.parse(value));
}
export function githubCredential(
  response: Record<string, unknown>,
  githubUserId: number,
  now = Date.now(),
) {
  const expiring = response.expires_in !== undefined;
  ensure(
    typeof response.access_token === "string" &&
      (!expiring ||
        (Number.isSafeInteger(response.expires_in) &&
          Number(response.expires_in) > 0 &&
          typeof response.refresh_token === "string" &&
          Number.isSafeInteger(response.refresh_token_expires_in) &&
          Number(response.refresh_token_expires_in) > 0)),
    "RECONNECT_REQUIRED",
    "GitHub returned an incomplete credential. Reconnect GitHub.",
  );
  return credential.parse({
    version: 1,
    githubUserId,
    accessToken: response.access_token,
    ...(expiring
      ? {
          accessExpiresAt: now + Number(response.expires_in) * 1000,
          refreshToken: response.refresh_token,
          refreshExpiresAt:
            now + Number(response.refresh_token_expires_in) * 1000,
        }
      : {}),
  });
}
export function githubRefreshRequired(
  value: ReturnType<typeof decodeGitHubCredential>,
  now = Date.now(),
) {
  return (
    "accessExpiresAt" in value &&
    value.accessExpiresAt !== undefined &&
    value.accessExpiresAt <= now + 60000
  );
}
export async function refreshGitHubCredential(value: GitHubUserCredential) {
  ensure(
    value.refreshToken &&
      value.refreshExpiresAt &&
      value.refreshExpiresAt > Date.now() &&
      process.env.GITHUB_APP_CLIENT_ID &&
      process.env.GITHUB_APP_CLIENT_SECRET,
    "RECONNECT_REQUIRED",
    "Reconnect GitHub to renew its authorization.",
  );
  const issuedAt = Date.now();
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_APP_CLIENT_ID,
      client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: value.refreshToken,
    }),
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  ensure(
    response.ok && !body.error,
    "RECONNECT_REQUIRED",
    "GitHub authorization could not be renewed. No repository operation was performed.",
  );
  return githubCredential(body, value.githubUserId, issuedAt);
}
