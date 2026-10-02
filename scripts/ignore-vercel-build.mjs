import { execFileSync } from "node:child_process";

// Vercel: 0 skips the build; 1 continues it. Unknown state always builds.
const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
let skip = false;
try {
  if (
    process.env.VIBESCROLLER_FORCE_BUILD !== "1" &&
    /^[a-f0-9]{40}$/i.test(previous ?? "")
  ) {
    const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
    }).trim();
    // Compare the last successful deployment, not HEAD^. An earlier code
    // update may still be waiting or have failed when a docs commit arrives.
    const files = execFileSync(
      "git",
      ["diff", "--name-only", "--no-renames", "-z", previous, "HEAD", "--"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )
      .split("\0")
      .filter(Boolean);
    skip = files.every(
      (file) =>
        file.startsWith("docs/") ||
        ["README.md", "AGENTS.md", "CHANGELOG.md"].includes(file),
    );
  }
} catch {
  // A shallow clone may lack the previous deployment. Never skip in that case.
}
console.log(
  skip
    ? "No application changes since the last successful deployment; skip build."
    : "Application changes or uncertain baseline; continue build.",
);
process.exitCode = skip ? 0 : 1;
