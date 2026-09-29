// @vitest-environment node
import { expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";

it("exports credential placeholders without local identity configuration and refuses to overwrite a product", () => {
  const root = resolve(import.meta.dirname, "..");
  const work = join(root, "work");
  mkdirSync(work, { recursive: true });
  const fixture = mkdtempSync(join(work, "auth-export-"));
  const source = join(fixture, "source");
  const output = join(fixture, "product");
  const put = (path: string, value: string) => {
    writeFileSync(join(source, path), value);
  };
  try {
    for (const dir of [
      "scripts",
      "apps/starter/.vercel",
      "packages/company-config",
      "packages/launchproof-integration",
    ])
      mkdirSync(join(source, dir), { recursive: true });
    for (const path of [
      "scripts/export-template.mjs",
      "package.json",
      "pnpm-workspace.yaml",
      "pnpm-lock.yaml",
      "packages/company-config/index.ts",
      "packages/launchproof-integration/server.ts",
      "packages/launchproof-integration/contract.ts",
      ".env.example",
      "apps/starter/.env.example",
    ])
      cpSync(join(root, path), join(source, path));
    put(".env.local", "WORKOS_API_KEY=synthetic-root-secret\n");
    put(
      "apps/starter/.env.local",
      "WORKOS_COOKIE_PASSWORD=synthetic-session-secret\nLP_INTEGRATION_ENABLED=true\nLP_INTEGRATION_SUMMARY_TOKEN=synthetic-lp-secret\nLP_INTEGRATION_APPLICATION_ID=private-reporting-app\n",
    );
    put(
      "apps/starter/.env.production",
      "WORKOS_CLIENT_ID=synthetic-suite-client\n",
    );
    put(
      "apps/starter/.vercel/project.json",
      '{"projectId":"synthetic-suite-project"}\n',
    );

    const script = join(source, "scripts/export-template.mjs");
    const args = [script, "--name", "independent-app", "--out", output];
    execFileSync(process.execPath, args, { cwd: source, stdio: "pipe" });
    for (const path of [
      ".env.local",
      "apps/starter/.env.local",
      "apps/starter/.env.production",
      "apps/starter/.vercel",
    ])
      expect(existsSync(join(output, path))).toBe(false);
    for (const path of [".env.example", "apps/starter/.env.example"]) {
      const example = readFileSync(join(output, path), "utf8");
      expect(example).toBe(readFileSync(join(root, path), "utf8"));
      const credentials = example
        .split(/\r?\n/)
        .filter((line) =>
          /^(?:WORKOS_(?:CLIENT_ID|API_KEY|COOKIE_PASSWORD)|GOOGLE_CLIENT_(?:ID|SECRET))=/.test(
            line,
          ),
        );
      expect(credentials.length).toBeGreaterThan(0);
      expect(credentials.every((line) => line.endsWith("="))).toBe(true);
    }
    const launchEnv = readFileSync(
      join(output, "apps/starter/.env.example"),
      "utf8",
    );
    expect(launchEnv).toMatch(/^LP_INTEGRATION_ENABLED=false$/m);
    expect(launchEnv).toMatch(/^LP_INTEGRATION_SUMMARY_TOKEN=$/m);
    expect(launchEnv).toMatch(/^LP_INTEGRATION_TARGET_ORGANIZATION_ID=$/m);
    expect(launchEnv).toMatch(/^LP_INTEGRATION_APPLICATION_ID=$/m);
    // Exercise the exported code in a fresh process with no provider configuration.
    const disabled = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `
      import { createLaunchProofIntegration, integrationConfigFromEnv } from './packages/launchproof-integration/server.ts';
      globalThis.fetch = () => { throw new Error('disabled export fetched'); };
      const integration = createLaunchProofIntegration(integrationConfigFromEnv({}), () => { throw new Error('disabled export authorized'); });
      process.stdout.write(JSON.stringify(await integration.read({ organizationId: 'new_org' })));
    `,
      ],
      { cwd: output, encoding: "utf8" },
    );
    expect(JSON.parse(disabled)).toEqual({ state: "disabled" });
    const config = readFileSync(
      join(output, "packages/company-config/index.ts"),
      "utf8",
    );
    expect(config).not.toContain("https://app.companynerve.com");
    expect(config).not.toContain("https://companynerve.com");
    const website = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "--eval",
          "import { company } from './packages/company-config/index.ts'; process.stdout.write(JSON.stringify(company.website));",
        ],
        { cwd: output, encoding: "utf8" },
      ),
    );
    expect(website.kind).toBe("product");
    expect(website.operator).toBeUndefined();
    expect(website.supportEmail).toBe("owner@example.com");
    expect(config).not.toContain("EXPONENTIAL EDUCATION");
    expect(config).not.toContain("54790758");
    writeFileSync(join(output, "README.md"), "Product owner's existing work\n");
    const retry = spawnSync(process.execPath, args, {
      cwd: source,
      encoding: "utf8",
    });
    expect(retry.status).toBe(1);
    expect(readFileSync(join(output, "README.md"), "utf8")).toBe(
      "Product owner's existing work\n",
    );
  } finally {
    // Only the uniquely created fixture below this repository's work directory.
    if (!fixture.startsWith(work + "/") && !fixture.startsWith(work + "\\"))
      throw new Error("Unexpected export fixture path");
    rmSync(fixture, { recursive: true, force: true });
  }
});
