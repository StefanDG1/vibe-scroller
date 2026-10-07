import { afterEach, expect, it, vi } from "vitest";
import {
  openEventCredentials,
  sealEventCredentials,
} from "../packages/mcp/credentials";
afterEach(() => vi.unstubAllEnvs());
const principal = {
  subject: "synthetic-user",
  clientId: "synthetic-client",
  consentId: "synthetic-consent",
};
const credentials = {
  token: "synthetic-access-token",
  callback: "https://receiver.example/event",
  secret: "whsec_" + Buffer.alloc(32, 7).toString("base64"),
};
it("keeps ephemeral callback authority encrypted and binds it to resource-purpose and exact principal", () => {
  vi.stubEnv("MCP_EVENT_SECRET_KEY_1", Buffer.alloc(32, 11).toString("base64"));
  const a = sealEventCredentials(credentials, principal),
    b = sealEventCredentials(credentials, principal);
  expect(a.ciphertext).not.toBe(b.ciphertext);
  expect(a.ciphertext).not.toContain(credentials.token);
  expect(a.ciphertext).not.toContain(credentials.secret);
  expect(openEventCredentials(a, principal)).toEqual(credentials);
  for (const changed of [
    { ...principal, subject: "other-user" },
    { ...principal, clientId: "other-client" },
    { ...principal, consentId: "other-consent" },
  ])
    expect(() => openEventCredentials(a, changed)).toThrow(
      "EVENT_CREDENTIALS_UNAVAILABLE",
    );
  const fields = a.ciphertext.split(".");
  const data = Buffer.from(fields[2], "base64");
  data[0] ^= 1;
  fields[2] = data.toString("base64");
  expect(() =>
    openEventCredentials({ ...a, ciphertext: fields.join(".") }, principal),
  ).toThrow("EVENT_CREDENTIALS_UNAVAILABLE");
  vi.stubEnv("MCP_EVENT_SECRET_KEY_1", Buffer.alloc(32, 12).toString("base64"));
  expect(() => openEventCredentials(a, principal)).toThrow(
    "EVENT_CREDENTIALS_UNAVAILABLE",
  );
});
it("requires configured dedicated versioned keys and bounded correctly shaped authority", () => {
  vi.stubEnv("MCP_EVENT_SECRET_KEY_1", "");
  expect(() => sealEventCredentials(credentials, principal)).toThrow(
    "EVENT_KEY_UNAVAILABLE",
  );
  vi.stubEnv("MCP_EVENT_SECRET_KEY_1", Buffer.alloc(32, 11).toString("base64"));
  const malformed = sealEventCredentials(
    { ...credentials, token: "x".repeat(16385) },
    principal,
  );
  expect(() => openEventCredentials(malformed, principal)).toThrow(
    "EVENT_CREDENTIALS_UNAVAILABLE",
  );
  vi.stubEnv("MCP_EVENT_SECRET_KEY_VERSION", "../../other");
  expect(() => sealEventCredentials(credentials, principal)).toThrow(
    "EVENT_KEY_UNAVAILABLE",
  );
});
