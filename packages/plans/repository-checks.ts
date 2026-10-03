import type { RepositoryExcerpt } from "../repositories/context";
import { ensure } from "../policy";

// Only complete, inspected JSON objects establish scripts. A partial window
// stays unknown rather than being repaired into guessed package metadata.
export function repositoryCheckContext(excerpts: RepositoryExcerpt[]) {
  const packages: {
    path: string;
    directory: string;
    packageManager?: string;
    scripts: string[];
  }[] = [];
  for (const excerpt of excerpts) {
    if (excerpt.startLine !== 1 || !/(?:^|\/)package\.json$/.test(excerpt.path))
      continue;
    try {
      const value = JSON.parse(excerpt.content);
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const manager =
        typeof value.packageManager === "string"
          ? /^(npm|pnpm|yarn|bun)@[^\s]+$/.exec(value.packageManager)?.[1]
          : undefined;
      packages.push({
        path: excerpt.path,
        directory:
          excerpt.path === "package.json"
            ? "."
            : excerpt.path.slice(0, -"/package.json".length),
        ...(manager ? { packageManager: manager } : {}),
        scripts:
          value.scripts &&
          typeof value.scripts === "object" &&
          !Array.isArray(value.scripts)
            ? Object.entries(value.scripts)
                .filter(
                  ([name, body]) =>
                    /^[\w:.-]+$/.test(name) &&
                    typeof body === "string" &&
                    body.trim().length > 0,
                )
                .map(([name]) => name)
                .sort()
            : [],
      });
    } catch {
      // Truncation, comments and malformed package files are unresolved facts.
    }
  }
  return {
    packageManager: packages.find((file) => file.directory === ".")
      ?.packageManager,
    packages,
    limitation:
      "Only listed complete package manifests establish script names. Uninspected manifests, shell behavior and check results remain unknown.",
  };
}

// A quality guard for recognizable package commands, not a shell security
// parser. Approved checks still execute only in the isolated worker.
export function validateGeneratedPackageChecks(
  commands: string[],
  excerpts: RepositoryExcerpt[],
) {
  const context = repositoryCheckContext(excerpts);
  for (const command of commands) {
    for (const invocation of command.matchAll(
      /(?:^|[;&|\n])\s*(npm|pnpm|yarn|bun)\b([^;&|\n]*)/g,
    )) {
      const manager = invocation[1];
      ensure(
        !context.packageManager || manager === context.packageManager,
        "INVALID_EVIDENCE",
        "A generated check uses a different manager than the inspected repository.",
      );
      const tokens = invocation[2].trim().split(/\s+/).filter(Boolean);
      let directory = ".";
      if (["--prefix", "--dir", "--cwd", "-C"].includes(tokens[0])) {
        const path = tokens.splice(0, 2)[1];
        if (!path || !/^[\w./-]+$/.test(path)) continue;
        directory = path.replace(/^\.\//, "").replace(/\/$/, "") || ".";
      }
      const explicitRun = tokens[0] === "run";
      const script = explicitRun ? tokens[1] : tokens[0];
      if (!script || script.startsWith("-")) continue;
      if (
        !explicitRun &&
        [
          "exec",
          "dlx",
          "install",
          "fetch",
          "add",
          "remove",
          "update",
          "list",
          "why",
          "audit",
          "outdated",
          "config",
          "help",
          "version",
          "publish",
          "pack",
          "rebuild",
          "prune",
          "store",
          "cache",
        ].includes(script)
      )
        continue;
      const manifest = context.packages.find(
        (file) => file.directory === directory,
      );
      ensure(
        manifest || context.packages.length === 0,
        "INVALID_EVIDENCE",
        "A generated package check needs the selected directory's inspected manifest.",
      );
      ensure(
        !manifest || manifest.scripts.includes(script),
        "INVALID_EVIDENCE",
        "A generated check names a script absent from the inspected package manifest.",
      );
    }
  }
}
