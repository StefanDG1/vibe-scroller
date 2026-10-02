import { expect, it } from "vitest";
import { publicPolicyHref } from "../packages/policy/public-documents";

it("routes policy references to actual web pages and preserves secure provider links", () => {
  expect(publicPolicyHref("PRIVACY.md")).toBe("/privacy");
  expect(publicPolicyHref("POLICY-IMPLEMENTATION.md")).toBe(
    "/publication-checklist",
  );
  expect(publicPolicyHref("REFUNDS.md#withdrawal")).toBe("/refunds#withdrawal");
  expect(publicPolicyHref("https://docs.stripe.com/payments")).toBe(
    "https://docs.stripe.com/payments",
  );
  expect(publicPolicyHref("mailto:contact@exponentialeducation.ro")).toBe(
    "mailto:contact@exponentialeducation.ro",
  );
});
it("blocks executable, credential-bearing, protocol-relative and unresolved policy links", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,x",
    "file:///tmp/private",
    "https://user:password@example.com",
    "//example.com",
    "\\\\example.com",
    "/\\example.com",
    "/%5cexample.com",
    "UNKNOWN.md",
    "../private/records.pdf",
    "java\nscript:alert(1)",
    "",
  ]) {
    expect(publicPolicyHref(url)).toBeUndefined();
  }
});
