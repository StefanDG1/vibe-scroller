// Presentation metadata never changes evidence, rights or processing identity.
export const insightIconKeys = [
  "lightbulb",
  "compass",
  "checklist",
  "code",
  "chart",
  "megaphone",
  "users",
  "palette",
  "shield",
  "workflow",
  "book",
  "heart",
  "wrench",
] as const;
export type InsightIconKey = (typeof insightIconKeys)[number];
export function insightPresentation(insight: {
  title?: string;
  claim: string;
  icon?: string;
  categories?: string[];
}) {
  const text = `${insight.title ?? ""} ${insight.categories?.join(" ") ?? ""}`;
  const inferred: InsightIconKey = /security|privacy|verif|evidence/i.test(text)
    ? "shield"
    : /design|interface|visual|video_editing/i.test(text)
      ? "palette"
      : /code|coding|software|engineering/i.test(text)
        ? "code"
        : /measure|metric|analytics|pricing/i.test(text)
          ? "chart"
          : /market|sales|content/i.test(text)
            ? "megaphone"
            : /customer|user|team/i.test(text)
              ? "users"
              : /workflow|automation|ai|operations/i.test(text)
                ? "workflow"
                : /health|fitness|wellbeing/i.test(text)
                  ? "heart"
                  : /check|step|setup/i.test(text)
                    ? "checklist"
                    : "lightbulb";
  return {
    title: insight.title?.trim() || insight.claim.trim(),
    icon: insightIconKeys.includes(insight.icon as InsightIconKey)
      ? (insight.icon as InsightIconKey)
      : inferred,
  };
}

// Older authorized clients may omit the new optional icon; persist a deterministic
// fallback on new analysis completion, without editing historical source records.
export function presentAnalysis<
  T extends {
    insights: {
      title?: string;
      claim: string;
      icon?: string;
      categories?: string[];
    }[];
  },
>(output: T) {
  return {
    ...output,
    insights: output.insights.map((insight) => ({
      ...insight,
      icon: insightPresentation(insight).icon,
    })),
  };
}
