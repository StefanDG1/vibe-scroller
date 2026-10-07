import {
  assistantIssuer,
  assistantResource,
} from "../packages/policy/assistant";
import type { AuthConfig } from "convex/server";
const clientId = process.env.WORKOS_CLIENT_ID;
const mcpIssuer = assistantIssuer(process.env.MCP_AUTH_ISSUER);
export default {
  providers: clientId
    ? [
        {
          type: "customJwt",
          issuer: "https://api.workos.com/",
          algorithm: "RS256",
          jwks: `https://api.workos.com/sso/jwks/${clientId}`,
          applicationID: clientId,
        },
        {
          type: "customJwt",
          issuer: `https://api.workos.com/user_management/${clientId}`,
          algorithm: "RS256",
          jwks: `https://api.workos.com/sso/jwks/${clientId}`,
        },
        ...(mcpIssuer
          ? [
              {
                type: "customJwt" as const,
                issuer: mcpIssuer,
                algorithm: "RS256" as const,
                jwks: `${mcpIssuer}/oauth2/jwks`,
                applicationID: assistantResource,
              },
            ]
          : []),
      ]
    : [],
} satisfies AuthConfig;
