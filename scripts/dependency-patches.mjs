import { createHash } from "node:crypto";

// Only exact, publicly reviewed patch bytes enter the clean image build.
export function reviewedDependencyPatches(patches = [], readFile) {
  if (!Array.isArray(patches) || patches.length > 10)
    throw Error("Review the bounded dependency patches");
  const names = new Set();
  return patches.map((patch) => {
    if (
      !patch ||
      !/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+@\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(
        patch.package,
      ) ||
      !/^patches\/[A-Za-z0-9@._+-]+\.patch$/.test(patch.path) ||
      !/^[a-f0-9]{64}$/.test(patch.sha256) ||
      names.has(patch.package)
    )
      throw Error("Review exact patch package, path and identity");
    names.add(patch.package);
    const content = readFile(patch.path);
    if (
      !Buffer.isBuffer(content) ||
      content.length > 20000 ||
      createHash("sha256").update(content).digest("hex") !== patch.sha256
    )
      throw Error("Reviewed dependency patch bytes changed");
    return { ...patch, content };
  });
}
