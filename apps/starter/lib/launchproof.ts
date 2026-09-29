import "server-only";
import { backend, api } from "./backend";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  createLaunchProofIntegration,
  integrationConfigFromEnv,
} from "../../../packages/launchproof-integration/server.ts";
import type { LaunchChecksStatus } from "../../../packages/launchproof-integration/contract.ts";

/** Only the route's organization ID enters here. Roles and config stay on the server. */
export async function readLaunchChecks(
  organizationId: string,
): Promise<LaunchChecksStatus> {
  const config = integrationConfigFromEnv(process.env);
  if (!config.enabled) return { state: "disabled" };
  // Request-local instance: never retain a user's authenticated client in a singleton.
  const integration = createLaunchProofIntegration(config, async (id) => {
    const info = await (
      await backend()
    ).query(api.organizations.details, {
      organizationId: id as Id<"organizations">,
    });
    return { organizationId: id, role: info.role };
  });
  try {
    return await integration.read({
      organizationId,
      commit: process.env.LP_INTEGRATION_CURRENT_COMMIT || undefined,
      deploymentId:
        process.env.LP_INTEGRATION_CURRENT_DEPLOYMENT_ID || undefined,
    });
  } catch {
    // Do not expose diagnostics, credentials, or affect the surrounding dashboard.
    return {
      state: "unavailable",
      label: "Launch checks unavailable",
      reason: "service",
      lastCheckedAt: null,
    };
  } finally {
    integration.disconnect();
  }
}
