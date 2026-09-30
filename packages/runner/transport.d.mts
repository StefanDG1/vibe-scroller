export class RunnerTransport {
  constructor(
    server: string,
    credential: string,
    options?: {
      fetchImpl?: (url: URL, init: RequestInit) => Promise<Response>;
    },
  );
  request(
    operation: "poll" | "heartbeat" | "complete" | "fail" | "status",
    args?: unknown,
  ): Promise<unknown>;
  credentialHash(): string;
}
