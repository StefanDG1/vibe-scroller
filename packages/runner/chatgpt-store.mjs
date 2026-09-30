import {
  mkdir,
  readFile,
  rename,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

// OAuth storage is deliberately separate from repository mappings and device keys.
export class ChatGPTStore {
  constructor() {
    if (process.platform !== "win32" || !process.env.LOCALAPPDATA)
      throw new Error("CHATGPT_STORAGE_UNAVAILABLE");
    this.directory = join(process.env.LOCALAPPDATA, "VibeScroller", "ChatGPT");
    this.file = join(this.directory, "session.dpapi");
  }
  async protect(operation, data) {
    return new Promise((resolve, reject) => {
      const child = spawn(
        "powershell.exe",
        [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-File",
          fileURLToPath(new URL("./chatgpt-storage.ps1", import.meta.url)),
        ],
        { shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
      );
      let output = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("CHATGPT_STORAGE_UNAVAILABLE"));
      }, 15000);
      child.stdout.on("data", (chunk) => {
        output += chunk;
        if (output.length > 2000000) child.kill();
      });
      child.stderr.resume();
      child.on("error", () => {
        clearTimeout(timer);
        reject(new Error("CHATGPT_STORAGE_UNAVAILABLE"));
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(output.trim());
        else reject(new Error("CHATGPT_STORAGE_UNAVAILABLE"));
      });
      child.stdin.end(JSON.stringify({ operation, data }));
    });
  }
  async lock(operation) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lock = join(this.directory, "session.lock");
    try {
      await mkdir(lock);
    } catch {
      throw new Error("CHATGPT_CONNECTION_BUSY");
    }
    try {
      return await operation();
    } finally {
      await rmdir(lock);
    }
  }
  async read() {
    let bytes;
    try {
      bytes = await readFile(this.file, "utf8");
    } catch (error) {
      if (error.code === "ENOENT")
        return { version: 1, hostId: `urn:uuid:${randomUUID()}`, profiles: [] };
      throw new Error("CHATGPT_STORAGE_UNAVAILABLE");
    }
    if (bytes.length > 1000000) throw new Error("CHATGPT_STORAGE_UNAVAILABLE");
    const state = JSON.parse(
      Buffer.from(await this.protect("unprotect", bytes), "base64").toString(
        "utf8",
      ),
    );
    if (
      state.version !== 1 ||
      !/^urn:uuid:[a-f0-9-]{36}$/.test(state.hostId) ||
      !Array.isArray(state.profiles)
    )
      throw new Error("CHATGPT_STORAGE_UNAVAILABLE");
    return state;
  }
  async write(state) {
    const encrypted = await this.protect(
      "protect",
      Buffer.from(JSON.stringify(state)).toString("base64"),
    );
    const temporary = join(this.directory, `${randomUUID()}.tmp`);
    await writeFile(temporary, encrypted, { mode: 0o600, flag: "wx" });
    try {
      await rename(temporary, this.file);
    } finally {
      await rm(temporary, { force: true });
    }
  }
}
