import { expect, it } from "vitest";
import {
  sealDatabase,
  openDatabase,
} from "../packages/recovery/database-backup.mjs";
const info = {
  purpose: "database-backup" as const,
  deployment: "synthetic-production",
  commit: "a".repeat(40),
};
const context = {
  restoreLock: true,
  sourceDeployment: info.deployment,
  destinationDeployment: "synthetic-recovery",
  purpose: info.purpose,
};
const key = new Uint8Array(32).fill(17),
  bytes = new TextEncoder().encode("Owned synthetic database ZIP bytes");
it("authenticates the archive, destination, purpose and seven-day expiry before decrypting", () => {
  const now = Date.now(),
    sealed = sealDatabase(bytes, info, key, now);
  expect(openDatabase(sealed, context, key, now)).toEqual(Buffer.from(bytes));
  for (const override of [
    { restoreLock: false },
    { sourceDeployment: "foreign" },
    { destinationDeployment: info.deployment },
    { purpose: "deletion-markers" as const },
  ])
    expect(() =>
      openDatabase(sealed, { ...context, ...override }, key, now),
    ).toThrow();
  expect(() =>
    openDatabase(sealed, context, key, now + 7 * 86400000),
  ).toThrow();
  expect(() =>
    openDatabase(
      { ...sealed, metadata: { ...sealed.metadata, commit: "b".repeat(40) } },
      context,
      key,
      now,
    ),
  ).toThrow();
  expect(() =>
    openDatabase(
      {
        ...sealed,
        metadata: { ...sealed.metadata, expiresAt: now + 8 * 86400000 },
      },
      context,
      key,
      now,
    ),
  ).toThrow();
  expect(() =>
    openDatabase(sealed, context, new Uint8Array(32).fill(18), now),
  ).toThrow();
});
it("does not interchange database archives and newer deletion manifests", () => {
  const sealed = sealDatabase(
    bytes,
    { ...info, purpose: "deletion-markers" },
    key,
  );
  expect(() => openDatabase(sealed, context, key)).toThrow();
  expect(
    openDatabase(sealed, { ...context, purpose: "deletion-markers" }, key),
  ).toEqual(Buffer.from(bytes));
  expect(() => sealDatabase(new Uint8Array(), info, key)).toThrow();
  expect(() => sealDatabase(bytes, info, new Uint8Array(16))).toThrow();
});
