export const publicPolicyDocuments: Record<string, string> = {
  legal: "LEGAL-NOTICE",
  terms: "TERMS",
  privacy: "PRIVACY",
  cookies: "COOKIES",
  refunds: "REFUNDS",
  "acceptable-use": "ACCEPTABLE-USE",
  copyright: "COPYRIGHT",
  subprocessors: "SUBPROCESSORS",
  dpa: "DPA",
  "publication-checklist": "POLICY-IMPLEMENTATION",
};

export function publicPolicyHref(input: string): string | undefined {
  if (
    !input ||
    Array.from(input).some(
      (character) =>
        character.charCodeAt(0) <= 32 ||
        character.charCodeAt(0) === 127 ||
        character === "\\",
    )
  )
    return undefined;
  const local = input.match(/^([A-Z-]+)\.md(#[a-zA-Z0-9_-]+)?$/);
  if (local) {
    const route = Object.entries(publicPolicyDocuments).find(
      ([, name]) => name === local[1],
    )?.[0];
    return route ? `/${route}${local[2] ?? ""}` : undefined;
  }
  if (/^\/[a-z0-9/_-]+(?:#[a-zA-Z0-9_-]+)?$/.test(input)) return input;
  try {
    const url = new URL(input);
    return ["https:", "mailto:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
