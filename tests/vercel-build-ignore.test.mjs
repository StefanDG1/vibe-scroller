import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL("../scripts/ignore-vercel-build.mjs", import.meta.url),
);
let root;
let initial;
let application;
function git(...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
function commit(file, text) {
  writeFileSync(join(root, file), text);
  git("add", "--", file);
  git("commit", "-qm", "Test change");
  return git("rev-parse", "HEAD");
}
function run(previous, extra = {}, cwd = root) {
  return spawnSync(process.execPath, [script], {
    cwd,
    env: {
      ...process.env,
      VERCEL_GIT_PREVIOUS_SHA: previous ?? "",
      VIBESCROLLER_FORCE_BUILD: "",
      ...extra,
    },
    encoding: "utf8",
  });
}
before(() => {
  root = mkdtempSync(join(tmpdir(), "vibescroller-build-policy-"));
  mkdirSync(join(root, "docs"));
  mkdirSync(join(root, "apps", "starter"), { recursive: true });
  mkdirSync(join(root, "legal"));
  git("init", "-q");
  git("config", "user.email", "build-policy@example.invalid");
  git("config", "user.name", "Build policy test");
  initial = commit("apps/starter/page.tsx", "export default 1;\n");
  application = commit("apps/starter/page.tsx", "export default 2;\n");
  commit("docs/status.md", "Evidence only.\n");
});
after(() => rmSync(root, { recursive: true, force: true }));
test("documentation-only changes skip, including execution from the project root", () => {
  assert.equal(run(application).status, 0);
  assert.equal(run(application, {}, join(root, "apps", "starter")).status, 0);
});
test("a pending code change followed by docs still builds from the deployed baseline", () => {
  assert.equal(run(initial).status, 1);
});
test("missing, malformed and unavailable shallow-clone baselines build safely", () => {
  for (const baseline of [undefined, "HEAD^", "a".repeat(40)]) {
    const result = run(baseline);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /continue build/);
  }
});
test("an explicit force build takes precedence over documentation-only changes", () => {
  assert.equal(run(application, { VIBESCROLLER_FORCE_BUILD: "1" }).status, 1);
});
test("policy content and unknown paths build; deleted runtime files also build", () => {
  const baseline = git("rev-parse", "HEAD");
  commit("legal/privacy.md", "Updated policy.\n");
  assert.equal(run(baseline).status, 1);
  const policy = git("rev-parse", "HEAD");
  commit("unknown.config", "runtime input\n");
  assert.equal(run(policy).status, 1);
  const unknown = git("rev-parse", "HEAD");
  git("rm", "apps/starter/page.tsx");
  git("commit", "-qm", "Remove runtime file");
  assert.equal(run(unknown).status, 1);
});
