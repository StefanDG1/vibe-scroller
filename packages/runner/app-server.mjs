import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
export class AppServer {
  constructor(
    binary,
    args = ["app-server", "--listen", "stdio://"],
    options = {},
  ) {
    this.next = 1;
    this.pending = new Map();
    this.listeners = new Set();
    this.proc = spawn(binary, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
      env:
        options.env ??
        Object.fromEntries(
          [
            "PATH",
            "SystemRoot",
            "WINDIR",
            "COMSPEC",
            "TEMP",
            "TMP",
            "USERPROFILE",
            "APPDATA",
            "LOCALAPPDATA",
            "CODEX_HOME",
          ]
            .filter((key) => process.env[key] !== undefined)
            .map((key) => [key, process.env[key]]),
        ),
    });
    createInterface({ input: this.proc.stdout }).on("line", (line) => {
      if (line.length > 1000000) return;
      let m;
      try {
        m = JSON.parse(line);
      } catch {
        return;
      }
      if (m.id !== undefined && (m.result !== undefined || m.error)) {
        const p = this.pending.get(m.id);
        if (p) {
          clearTimeout(p.timer);
          this.pending.delete(m.id);
          if (m.error) p.reject(new Error(m.error.message));
          else p.resolve(m.result);
        }
      } else for (const listener of this.listeners) listener(m);
    });
    this.proc.stderr.resume();
    this.proc.on("error", () => this.close());
    this.proc.on("exit", () => {
      for (const p of this.pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error("Official app-server exited."));
      }
      this.pending.clear();
    });
  }
  request(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.next++,
        timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error("App-server request timed out."));
        }, 30000);
      this.pending.set(id, { resolve, reject, timer });
      this.send({ id, method, params });
    });
  }
  send(message) {
    this.proc.stdin.write(JSON.stringify(message) + "\n");
  }
  async initialize() {
    const result = await this.request("initialize", {
      clientInfo: {
        name: "vibescroller_runner",
        title: "VibeScroller local runner",
        version: "0.1.0",
      },
    });
    this.send({ method: "initialized", params: {} });
    return result;
  }
  onEvent(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  async account() {
    return this.request("account/read", { refreshToken: false });
  }
  async models() {
    return this.request("model/list", { includeHidden: false });
  }
  async start({ cwd, model, plan }) {
    const result = await this.request("thread/start", {
      cwd,
      model,
      sandbox: "workspace-write",
      approvalPolicy: "on-request",
      ephemeral: true,
    });
    const threadId = result.thread.id;
    const turn = await this.request("turn/start", {
      threadId,
      input: [{ type: "text", text: plan }],
    });
    return { threadId, turnId: turn.turn.id };
  }
  async interrupt(threadId, turnId) {
    return this.request("turn/interrupt", { threadId, turnId });
  }
  deny(message) {
    if (message.id !== undefined) {
      if (
        [
          "item/commandExecution/requestApproval",
          "item/fileChange/requestApproval",
        ].includes(message.method)
      )
        this.send({ id: message.id, result: { decision: "decline" } });
      else
        this.send({
          id: message.id,
          error: {
            code: -32601,
            message:
              "This operation is unavailable under the current bounded execution policy.",
          },
        });
    }
  }
  close() {
    this.proc.stdin.end();
    this.proc.kill();
  }
}
