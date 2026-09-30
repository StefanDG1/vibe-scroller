import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const script = fileURLToPath(new URL("./vault.ps1", import.meta.url));
export function vault(operation, target, secret) {
  if (process.platform !== "win32")
    throw new Error("Windows credential storage is required for this runner.");
  if (
    !["write", "read", "delete"].includes(operation) ||
    !/^VibeScroller\/[a-zA-Z0-9_-]{8,100}$/.test(target)
  )
    throw new Error("Invalid credential operation.");
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-File", script],
      {
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,
        windowsHide: true,
      },
    );
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Credential vault timed out."));
    }, 15000);
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      if (output.length > 10000) child.kill();
    });
    // Do not print subprocess stderr, arguments or credential JSON.
    child.stderr.resume();
    child.once("error", () => {
      clearTimeout(timer);
      reject(new Error("Credential vault is unavailable."));
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error("Credential vault operation failed."));
      else {
        try {
          resolve(JSON.parse(output));
        } catch {
          reject(new Error("Invalid credential vault response."));
        }
      }
    });
    child.stdin.end(
      JSON.stringify({
        operation,
        target,
        ...(secret === undefined ? {} : { secret }),
      }),
    );
  });
}
