import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncBuiltinESMExports } from "node:module";

// Trusted OpenNext packaging only. This does not run customer code or alter OS policy.
if (process.platform === "win32") {
  const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
  const original = fs.symlinkSync;
  const inside = (value) => {
    const relative = path.relative(root, value);
    return (
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    );
  };
  fs.symlinkSync = (target, destination, type) => {
    const absoluteDestination = path.resolve(String(destination));
    const absoluteTarget = path.resolve(
      path.dirname(absoluteDestination),
      String(target),
    );
    if (
      inside(absoluteDestination) &&
      inside(absoluteTarget) &&
      fs.statSync(absoluteTarget).isDirectory()
    ) {
      return original(absoluteTarget, absoluteDestination, "junction");
    }
    return original(target, destination, type);
  };
  syncBuiltinESMExports();
}
