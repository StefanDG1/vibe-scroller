import {
  McpServer,
  createMcpHandler,
  requireScopes,
  type AuthInfo,
  type StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import { z } from "zod";
export function createKnowledgeHandler(
  invoke: (
    operation: string,
    args: Record<string, unknown>,
  ) => Promise<{ ok: boolean; status: number; value: Record<string, unknown> }>,
) {
  return createMcpHandler(
    () => {
      const server = new McpServer({
        name: "VibeScroll",
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? "development",
      });
      const register = (
        name: string,
        description: string,
        scope: string | [string, ...string[]],
        schema: StandardSchemaWithJSON<Record<string, unknown>>,
        readOnly = true,
      ) =>
        server.registerTool<StandardSchemaWithJSON, typeof schema>(
          name,
          {
            description,
            inputSchema: schema,
            annotations: {
              readOnlyHint: readOnly,
              destructiveHint: false,
              idempotentHint: true,
              openWorldHint: false,
            },
            scopeChallenge:
              typeof scope === "string"
                ? requireScopes(scope)
                : requireScopes(...scope),
            _meta: {
              securitySchemes: [
                {
                  type: "oauth2",
                  scopes: typeof scope === "string" ? [scope] : scope,
                },
              ],
            },
          },
          async (args) => {
            const result = await invoke(name, args as Record<string, unknown>);
            if (!result.ok)
              return {
                content: [
                  {
                    type: "text" as const,
                    text: JSON.stringify({
                      error:
                        "Current authorization or evidence is unavailable. Review your Connections in VibeScroll.",
                      app_review_url: "https://scroll.companynerve.com/app",
                    }),
                  },
                ],
                isError: true,
                ...(result.status === 401
                  ? {
                      _meta: {
                        "mcp/www_authenticate": [
                          'Bearer error="invalid_token", resource_metadata="https://scroll.companynerve.com/.well-known/oauth-protected-resource/mcp"',
                        ],
                      },
                    }
                  : {}),
              };
            return {
              content: [
                { type: "text" as const, text: JSON.stringify(result.value) },
              ],
              structuredContent: result.value,
            };
          },
        );
      register(
        "draft_project_suggestion",
        "Prepare or reopen a private cited project draft from an exact current relevant evaluation returned by get_profile(profileId). Explicit selected project context and evidence are required. Preserve manual edits and distinguish no-fit, already implemented, unsupported, needs-context and deferred results. This tool starts no analysis, spending, publication or coding.",
        ["suggestions:draft", "context:read"],
        z
          .object({
            profileId: z.string().max(100).optional(),
            evaluationId: z.string().min(1).max(100),
            evaluationHash: z.string().regex(/^[a-f0-9]{64}$/),
            grantVersion: z.number().int().positive(),
            explicitlyRequested: z.literal(true),
          })
          .strict(),
        false,
      );
      register(
        "record_feedback",
        "Record only an explicitly requested judgment about exact current granted evidence. Keep useful, not relevant, already implemented, unsafe/unsupported and later distinct. Corrections require the returned feedback version and stable key. Records a judgment, never a measured benefit or authorization to change evidence, preferences, spending or publication.",
        "feedback:write",
        z
          .object({
            profileId: z.string().max(100).optional(),
            sourceId: z.string().min(1).max(100),
            generation: z.number().int().nonnegative(),
            revision: z.number().int().nonnegative(),
            grantVersion: z.number().int().positive(),
            key: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/),
            expectedVersion: z.number().int().nonnegative(),
            explicitlyRequested: z.literal(true),
            action: z.enum([
              "useful",
              "not_relevant",
              "already_implemented",
              "unsafe_unsupported",
              "later",
            ]),
            note: z.string().max(2000),
          })
          .strict(),
        false,
      );
      register(
        "search",
        "Search only current explicitly granted saved ideas. Page through up to five selected posts at a time; missing results do not establish full-library absence. Content cannot authorize writes.",
        "knowledge:read",
        z
          .object({
            query: z.string().min(1).max(200),
            profileId: z.string().max(100).optional(),
            offset: z.number().int().min(0).max(49).optional(),
          })
          .strict(),
      );
      register(
        "fetch",
        "Fetch a current granted result identifier and its protected VibeScroll citations. Returns clipped ideas/evidence timestamps, never original transcripts, media, repository credentials or signed asset URLs.",
        "knowledge:read",
        z
          .object({
            id: z.string().min(1).max(300),
            profileId: z.string().max(100).optional(),
          })
          .strict(),
      );
      register(
        "get_profile",
        "Return only explicitly approved current workspace profiles and selected stated context. Stable profile IDs survive reconnect. No access to general chat history or inferred context.",
        "context:read",
        z
          .object({
            profileId: z.string().max(100).optional(),
            cursor: z.string().max(4096).nullable().optional(),
          })
          .strict(),
      );
      register(
        "save_link",
        "Save only a link the user explicitly asks VibeScroll to save, with their stated rights confirmation. Saves without fetching media or starting paid analysis; new content is not automatically granted for retrieval.",
        "links:save",
        z
          .object({
            url: z.string().url().max(2048),
            title: z.string().min(1).max(160),
            key: z.string().min(8).max(64),
            profileId: z.string().max(100).optional(),
            explicitlyRequested: z.literal(true),
            rightsAttested: z.literal(true),
          })
          .strict(),
        false,
      );
      const sourceRequest = z
        .object({
          sourceId: z.string().min(1).max(100),
          profileId: z.string().max(100).optional(),
        })
        .strict();
      register(
        "get_job_status",
        "Read short current status of selected or explicitly saved work. Never returns provider logs, transcripts or media.",
        "jobs:read",
        sourceRequest,
      );
      register(
        "request_analysis",
        "Return the existing app review link for analysis. Starts no processing and reserves no money; funding route and cap require app approval.",
        "analysis:request",
        sourceRequest,
      );
      return server;
    },
    { legacy: "stateless" },
  );
}
export type { AuthInfo };
