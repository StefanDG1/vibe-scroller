"use node";
import { internalAction } from "./_generated/server";
import { getServiceToken } from "convex/server";
import { v } from "convex/values";
// This checks access without generating tokens or returning a deployment credential.
export const capability = internalAction({
  args: {},
  handler: async () => {
    try {
      const token = await getServiceToken("ai-gateway");
      const response = await fetch("https://ai-gateway.convex.dev/v1/models", {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        return {
          available: false,
          reason: "Gateway model discovery unavailable.",
        };
      const result = await response.json();
      return {
        available: true,
        modelCount: (result.data ?? []).length,
        freeModels: (result.data ?? [])
          .filter((m: any) => m.id.endsWith(":free"))
          .map((m: any) => m.id),
        inferenceTested: false,
      };
    } catch {
      return {
        available: false,
        reason:
          "Gateway access requires an eligible Convex team and deployment. No inference or paid fallback was attempted.",
        inferenceTested: false,
      };
    }
  },
});
export const syntheticProbe = internalAction({
  args: { model: v.string() },
  handler: async (_, a) => {
    // No private content, model fallback, tools, or paid model is accepted by this diagnostic.
    if (
      ![
        "liquid/lfm-2.5-2.6b:free",
        "poolside/laguna-xs-2.1:free",
        "qwen/qwen3.8-27b:free",
      ].includes(a.model)
    )
      throw new Error("Only reviewed free diagnostic models are allowed.");
    const token = await getServiceToken("ai-gateway");
    const response = await fetch(
      "https://ai-gateway.convex.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: a.model,
          max_tokens: 1200,
          messages: [
            {
              role: "user",
              content:
                'Synthetic VibeScroller diagnostic. Return JSON with summary: "A synthetic note proposes adding a search field", and coverage: "caption_only". No tools.',
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "probe",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["summary", "coverage"],
                properties: {
                  summary: { type: "string" },
                  coverage: { type: "string", enum: ["caption_only"] },
                },
              },
            },
          },
        }),
        signal: AbortSignal.timeout(60000),
      },
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        ok: false,
        status: response.status,
        model: a.model,
        errorCode: error.error?.code ?? null,
        reason:
          typeof error.error?.message === "string"
            ? error.error.message.slice(0, 600)
            : "Unavailable",
        retryAfter: response.headers.get("retry-after"),
      };
    }
    const result = await response.json();
    return {
      ok: true,
      model: a.model,
      text: result.choices?.[0]?.message?.content,
      usage: result.usage,
      synthetic: true,
    };
  },
});
