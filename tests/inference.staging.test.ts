import { it, expect } from "vitest";
import { cfStructured } from "../packages/providers/cloudflare";
import { insightOutput } from "../packages/contracts";
import schema from "../contracts/insight.schema.json";
it.skipIf(process.env.VIBE_STAGING_TEST !== "cloudflare")(
  "extracts main points from a synthetic rights-cleared note using the selected free provider",
  async () => {
    const sourceId = "synthetic-staging-source",
      processingRunId = "synthetic-staging-run";
    const bounded = structuredClone(schema);
    Object.assign(bounded.properties.sourceId, { const: sourceId });
    Object.assign(bounded.properties.processingRunId, {
      const: processingRunId,
    });
    const result = await cfStructured(
      bounded,
      "Summarize the text and include three distinct substantive main points in insights. Every evidence item must have id supplied_text, kind user_note, null startMs and endMs. Coverage is caption_only. Return valid schema fields, preserve uncertainty, and label benefits as proposals.",
      {
        sourceId,
        processingRunId,
        text: "Synthetic staging note. Label uncertainty when a transcript is incomplete. Show evidence beside each main point so a reviewer can check the claim. Require approval of the exact plan before a coding task starts. These are proposed product controls, not measured benefits.",
      },
    );
    const analysis = insightOutput.parse(result.output) as {
      sourceId: string;
      coverage: string;
      insights: unknown[];
    };
    expect(analysis.sourceId).toBe(sourceId);
    expect(analysis.coverage).toBe("caption_only");
    expect(analysis.insights.length).toBeGreaterThanOrEqual(1);
    console.log(
      JSON.stringify({
        synthetic: true,
        points: analysis.insights.length,
        neurons: result.usage.neurons,
        credits: result.credits,
      }),
    );
  },
  120000,
);
