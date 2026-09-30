import { it, expect } from "vitest";
import { installationToken, github } from "../packages/providers/github";
import { excludedPath } from "../packages/policy";
import { codeChanges } from "../packages/providers/cloud";
it.skipIf(process.env.VIBE_STAGING_TEST !== "snapshot")(
  "reads the authorized staging snapshot without executing repository code",
  async () => {
    const token = await installationToken(166336578);
    const tree = await github(
      "/repos/StefanDG1/vibe-scroller/git/trees/88a98153381e89d4cda0540675b46a69d0ae5ade?recursive=1",
      token,
    );
    const items = tree.tree.filter(
      (f: any) =>
        f.type === "blob" &&
        f.mode !== "120000" &&
        !excludedPath(f.path) &&
        !/\.(png|jpe?g|gif|webp|ico|pdf|zip|xlsx?|woff2?|ttf|mp[34]|wav)$/i.test(
          f.path,
        ),
    );
    console.log(
      JSON.stringify({
        count: items.length,
        bytes: items.reduce((n: number, f: any) => n + f.size, 0),
        oversize: items
          .filter((f: any) => f.size > 500000)
          .map((f: any) => ({ path: f.path, bytes: f.size })),
      }),
    );
    const result = await codeChanges({
      repo: { installationId: 166336578, fullName: "StefanDG1/vibe-scroller" },
      baseSha: "88a98153381e89d4cda0540675b46a69d0ae5ade",
      plan: {},
      allowedPaths: ["docs/source-troubleshooting.md"],
      highRisk: false,
      maxCredits: 25,
      generate: async () => ({
        output: {
          files: [
            {
              path: "docs/source-troubleshooting.md",
              content:
                "Synthetic diagnostic only, not a generated model result.",
            },
          ],
          limitations: ["No model used in this read-boundary diagnostic."],
        },
        credits: 0,
      }),
    });
    expect(result.base.length).toBeGreaterThan(0);
  },
  120000,
);
