import { expect, it, vi, afterEach } from "vitest";
import { signedReadObject } from "../packages/providers/storage-read";
import { signedObject } from "../packages/providers/storage";
afterEach(() => vi.unstubAllEnvs());
it("matches the independently implemented Node AWS signature for a fixed read lease and rejects unsafe targets", async () => {
  vi.stubEnv("R2_ENDPOINT", "https://synthetic.eu.r2.cloudflarestorage.com");
  vi.stubEnv("R2_BUCKET", "synthetic-evidence");
  vi.stubEnv("R2_ACCESS_KEY_ID", "synthetic-backup-read-key");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "synthetic-backup-read-secret");
  const now = new Date("2026-10-02T14:00:00.000Z");
  expect(await signedReadObject("workspace/frame with space", now)).toBe(
    signedObject("workspace/frame with space", "GET", 60, now),
  );
  for (const path of [
    "../secret",
    "workspace/../secret",
    "workspace\\secret",
    "workspace//secret",
  ])
    await expect(signedReadObject(path, now)).rejects.toThrow("INVALID_INPUT");
  for (const endpoint of [
    "http://synthetic.eu.r2.cloudflarestorage.com",
    "https://secret@synthetic.eu.r2.cloudflarestorage.com",
    "https://synthetic.r2.cloudflarestorage.com",
  ]) {
    vi.stubEnv("R2_ENDPOINT", endpoint);
    await expect(signedReadObject("workspace/frame", now)).rejects.toThrow(
      "STORAGE_JURISDICTION_REQUIRED",
    );
  }
});
