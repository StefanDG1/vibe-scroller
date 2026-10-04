import type { ManifestEntry } from "./snapshotCache";

export const BUSINESS_CONTEXT_VERSION = "business-context-v2";
export const profileFields = {
  purpose: { label: "Purpose", limit: 400 },
  audience: { label: "Audiences and buyers", limit: 500 },
  stage: { label: "Stage and verified availability", limit: 300 },
  goals: { label: "Goals", limit: 400 },
  businessModel: { label: "Business model", limit: 400 },
  constraints: { label: "Constraints", limit: 500 },
  nonGoals: { label: "Non-goals and unknowns", limit: 400 },
  roles: { label: "User roles and permissions", limit: 1100 },
  features: { label: "Features and how they work", limit: 1400 },
  journeys: { label: "User journeys and interface", limit: 900 },
  foundations: { label: "Foundational brief and evidence", limit: 800 },
  evidence: { label: "Repository evidence and coverage", limit: 600 },
} as const;
export const profileFieldNames = Object.keys(
  profileFields,
) as (keyof typeof profileFields)[];

// These are discovery priorities, never access permissions or proof of a feature.
function category(path: string) {
  if (/^docs\/foundational\/(?!.*(?:archive|old|legacy|prompts))/.test(path))
    return "foundation";
  if (/^(?:README\.md|package\.json)$/.test(path)) return "overview";
  if (
    /(?:schema|auth|permission|role|routing|router|routes)\.(?:tsx?|jsx?)$/i.test(
      path,
    )
  )
    return "access";
  if (/(?:parent|student|teacher|school|director|admin)/i.test(path))
    return "role";
  if (/\.(?:tsx|jsx|css)$/.test(path)) return "interface";
  if (/^(?:docs|shared|convex|src|apps)\//.test(path)) return "implementation";
  return "other";
}
export function businessEvidenceFiles(entries: ManifestEntry[]) {
  const eligible = entries.filter(
    (e) =>
      /(?:README|package\.json|\.(?:md|tsx?|jsx?|css|json|py|go|rs|docx))$/i.test(
        e.path,
      ) &&
      !/(?:^|\/)(?:archive|foundational-old|seed|fixtures|node_modules|_generated|demo|\.agents|\.claude)(?:\/|$)|(?:\.test\.|\.spec\.|lock\.)/.test(
        e.path,
      ),
  );
  const result: ManifestEntry[] = [];
  const add = (files: ManifestEntry[], count: number) => {
    const rank = (path: string) =>
      /(?:^|\/)(?:schema|roles|permissions)\.ts$/.test(path)
        ? 0
        : /(?:^|\/)(?:dashboard|page|layout)\.(tsx|jsx)$/.test(path)
          ? 1
          : /\/research|research\.docx$/.test(path)
            ? 2
            : 3;
    for (const file of files.sort(
      (a, b) =>
        rank(a.path) - rank(b.path) ||
        a.path.length - b.path.length ||
        a.path.localeCompare(b.path),
    )) {
      if (count <= 0) break;
      if (!result.some((r) => r.path === file.path)) {
        result.push(file);
        count--;
      }
    }
  };
  add(
    eligible.filter((e) => category(e.path) === "overview"),
    2,
  );
  // Discover every documented audience before spending the remaining file reads.
  const foundations = eligible.filter((e) => category(e.path) === "foundation");
  const groups = [
    ...new Set(foundations.map((e) => e.path.split("/")[2])),
  ].sort();
  for (const group of groups)
    add(
      foundations.filter((e) => e.path.split("/")[2] === group),
      4,
    );
  add(
    eligible.filter((e) => category(e.path) === "access"),
    3,
  );
  for (const role of [
    "parent",
    "student",
    "teacher",
    "school",
    "director",
    "admin",
  ]) {
    const files = eligible.filter(
      (e) => category(e.path) === "role" && new RegExp(role, "i").test(e.path),
    );
    add(
      files.filter((e) => /\.(tsx|jsx)$/.test(e.path)),
      1,
    );
    add(
      files.filter((e) => !/\.(tsx|jsx)$/.test(e.path)),
      1,
    );
  }
  add(
    eligible.filter(
      (e) => category(e.path) === "interface" && /^(?:src|apps)\//.test(e.path),
    ),
    3,
  );
  add(
    eligible.filter((e) => category(e.path) === "implementation"),
    4,
  );
  return result.slice(0, 40);
}
export function boundedDiscoveryIndex(entries: ManifestEntry[]) {
  const priority = new Set(businessEvidenceFiles(entries).map((e) => e.path));
  const ordered = [...entries].sort(
    (a, b) =>
      Number(priority.has(b.path)) - Number(priority.has(a.path)) ||
      a.path.localeCompare(b.path),
  );
  const selected: ManifestEntry[] = [];
  let bytes = 4; // Two arrays, including their brackets.
  for (const row of ordered) {
    const next =
      new TextEncoder().encode(JSON.stringify(row) + JSON.stringify(row.path))
        .length + (selected.length ? 2 : 0);
    if (selected.length === 5000 || bytes + next > 600000) break;
    selected.push(row);
    bytes += next;
  }
  return selected;
}
