import { createHash } from "node:crypto";
export class RunnerTransport {
  constructor(server, credential, { fetchImpl = fetch } = {}) {
    const url = new URL(server);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^[A-Za-z0-9_-]{43}$/.test(credential)
    )
      throw new Error("Invalid HTTPS runner configuration.");
    this.endpoint = new URL("/runner/v1", url);
    this.credential = credential;
    this.fetchImpl = fetchImpl;
  }
  async request(operation, args = {}) {
    if (
      !["poll", "heartbeat", "complete", "fail", "status"].includes(operation)
    )
      throw new Error("Unsupported runner operation.");
    const body = JSON.stringify({ protocolVersion: "1.0.0", operation, args });
    if (Buffer.byteLength(body) > 1000000)
      throw new Error("Runner artifact exceeds its byte bound.");
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.credential}`,
      },
      body,
      signal: AbortSignal.timeout(20000),
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("application/json")
    )
      throw new Error(
        "Runner request failed; reconcile the lease before resuming.",
      );
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1000000)
          throw new Error("Runner response exceeds its byte bound.");
        chunks.push(Buffer.from(value));
      }
    } finally {
      await reader.cancel();
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
  credentialHash() {
    return createHash("sha256").update(this.credential).digest("hex");
  }
}
