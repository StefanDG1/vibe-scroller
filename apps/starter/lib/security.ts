export function privateContentPolicy(nonce: string, development: boolean) {
  const connect = new Set(["'self'"]);
  for (const name of ["NEXT_PUBLIC_CONVEX_URL", "R2_ENDPOINT"]) {
    const raw = process.env[name];
    if (!raw) continue;
    const url = new URL(raw);
    if (url.protocol !== "https:") continue;
    connect.add(url.origin);
    if (name === "NEXT_PUBLIC_CONVEX_URL")
      connect.add(url.origin.replace("https:", "wss:"));
  }
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) connect.add("https://eu.i.posthog.com");
  if (development) connect.add("ws://localhost:3001");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${Array.from(connect).join(" ")}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!development ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
