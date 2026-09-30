import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
export const productLimits = new RateLimiter(components.rateLimiter, {
  capture: { kind: "token bucket", rate: 30, period: MINUTE, capacity: 5 },
  modelRequest: { kind: "token bucket", rate: 6, period: MINUTE, capacity: 2 },
});
