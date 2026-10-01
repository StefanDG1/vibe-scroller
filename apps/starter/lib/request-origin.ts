// Hosts can rewrite request.url to their internal function origin. APP_URL is
// operator configuration, never a caller-supplied forwarded header.
export function allowedRequestOrigin(request: Request) {
  try {
    const configured = process.env.APP_URL;
    const expected = new URL(configured || request.url);
    if (
      expected.username ||
      expected.password ||
      !["https:", "http:"].includes(expected.protocol) ||
      (expected.protocol === "http:" &&
        !["localhost", "127.0.0.1"].includes(expected.hostname))
    )
      return false;
    return request.headers.get("origin") === expected.origin;
  } catch {
    return false;
  }
}
