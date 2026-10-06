import type { ChildProcessWithoutNullStreams } from "node:child_process";

type Message = {
  id?: number;
  method: string;
  params?: Record<string, unknown>;
};

export class AppServer {
  constructor(
    binary: string,
    args?: string[],
    options?: { env?: NodeJS.ProcessEnv },
  );
  proc: ChildProcessWithoutNullStreams;
  request<T = Record<string, unknown>>(
    method: string,
    params?: unknown,
  ): Promise<T>;
  send(message: unknown): void;
  initialize(): Promise<unknown>;
  onEvent(listener: (message: Message) => void): () => void;
  account(): Promise<unknown>;
  models(): Promise<unknown>;
  start(input: {
    cwd: string;
    model: string;
    plan: string;
  }): Promise<{ threadId: string; turnId: string }>;
  interrupt(threadId: string, turnId: string): Promise<unknown>;
  deny(message: Message): void;
  close(): void;
}
