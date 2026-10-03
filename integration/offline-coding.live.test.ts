import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createJobSandbox } from "../packages/providers/sandbox";
import { hardenSandbox } from "../packages/providers/isolation";
import { checkPatch } from "../packages/providers/cloud";
import { prepareOfflineDependencies } from "../packages/providers/offline-dependencies";
import profile from "../infra/offline-dependency-cache.json";

it("the selected worker checks owned React/TypeScript offline and refuses hooks, changed sources and missing packages", async () => {
  const sandbox = await createJobSandbox("coding", 180);
  try {
    await hardenSandbox(sandbox);
    expect(
      (
        await sandbox.commands.run("cat /opt/vibe/foundation-cache.sha256", {
          user: "user",
        })
      ).stdout.trim(),
    ).toBe(profile.lockfileSha256);
    const base = [
      ...["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"].map(
        (path) => ({
          path,
          content: readFileSync(
            "fixtures/offline-coding/react/" + path,
            "utf8",
          ),
          mode: "100644",
        }),
      ),
      {
        path: ".pnpmfile.cjs",
        content: 'throw new Error("UNTRUSTED_PNPM_HOOK_RAN");',
        mode: "100644",
      },
      {
        path: "tsconfig.json",
        content: JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            jsx: "react-jsx",
            esModuleInterop: true,
            skipLibCheck: true,
            strict: true,
          },
          include: ["button.tsx"],
        }),
        mode: "100644",
      },
      {
        path: "button.tsx",
        content:
          'import React from "react";\nexport const Action=()=> <button style={{minHeight:20}}>Review insights</button>;\n',
        mode: "100644",
      },
    ];
    const checked = await checkPatch(
      sandbox,
      base,
      [
        {
          path: "button.tsx",
          content:
            'import React from "react";\nexport const Action=()=> <button style={{minHeight:44}}>Review insights</button>;\n',
        },
      ],
      [
        "test ! -e INSTALL_SCRIPT_RAN && pnpm exec tsc --noEmit",
        "node --input-type=module -e \"import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; const s=renderToStaticMarkup(React.createElement('button',{style:{minHeight:44}},'Review insights')); if(!s.includes('44px')) process.exit(1);\"",
      ],
    );
    expect(checked.patch).toContain("minHeight:44");
    expect(
      (
        await sandbox.commands.run(
          'test ! -w /opt/vibe/pnpm-store && test ! -w /opt/vibe/foundation-cache.sha256 && test "$(id -u)" = 1001',
          { user: "user" },
        )
      ).exitCode,
    ).toBe(0);
    const missing = [
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
    ].map((path) => ({
      path,
      content: readFileSync("fixtures/offline-coding/uncached/" + path, "utf8"),
    }));
    await sandbox.files.write(
      missing.map((file) => ({
        path: "/home/user/job/" + file.path,
        data: file.content,
      })),
      { user: "user" },
    );
    await expect(
      prepareOfflineDependencies(sandbox, missing, ["pnpm test"]),
    ).rejects.toThrow("no network, install scripts or fallback");
  } finally {
    await sandbox.kill();
  }
}, 180000);

it("explicit pnpm scripts run without automatic pre/post or default pnpmfile hooks", async () => {
  const vm = await createJobSandbox("coding", 180);
  try {
    await hardenSandbox(vm);
    const pkg = JSON.parse(
      readFileSync("fixtures/offline-coding/react/package.json", "utf8"),
    );
    pkg.scripts = {
      check: "node -e \"console.log('APPROVED_CHECK_RAN')\"",
      precheck:
        "node -e \"require('fs').writeFileSync('IMPLICIT_HOOK_RAN','pre')\"",
      postcheck:
        "node -e \"require('fs').writeFileSync('IMPLICIT_HOOK_RAN','post')\"",
    };
    const files = [
      { path: "package.json", content: JSON.stringify(pkg), mode: "100644" },
      ...["pnpm-lock.yaml", "pnpm-workspace.yaml"].map((path) => ({
        path,
        content: readFileSync("fixtures/offline-coding/react/" + path, "utf8"),
        mode: "100644",
      })),
      {
        path: ".pnpmfile.mjs",
        content: "throw new Error('DEFAULT_PNPM_HOOK_RAN');",
        mode: "100644",
      },
      {
        path: ".pnpmfile.cjs",
        content: "throw new Error('LEGACY_PNPM_HOOK_RAN');",
        mode: "100644",
      },
      { path: "owned.txt", content: "owned original", mode: "100644" },
    ];
    const checked = await checkPatch(
      vm,
      files,
      [{ path: "owned.txt", content: "owned reviewed" }],
      [
        "pnpm run check && test ! -e IMPLICIT_HOOK_RAN && test ! -e INSTALL_SCRIPT_RAN",
      ],
    );
    expect(checked.report).toContain("APPROVED_CHECK_RAN");
    expect(checked.report).toContain("Exit 0:");
  } finally {
    await vm.kill();
  }
}, 180000);
