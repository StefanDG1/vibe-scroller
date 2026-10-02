import { ensure } from "../policy";
export function selectedInsights<T extends { id: string }>(
  insights: T[],
  ids?: string[],
) {
  ensure(
    insights.length > 0,
    "CONTEXT_REQUIRED",
    "Analyze this post before matching it.",
  );
  if (ids === undefined) return insights;
  ensure(
    ids.length > 0 &&
      ids.length <= 40 &&
      new Set(ids).size === ids.length &&
      ids.every((id) => insights.some((i) => i.id === id)),
    "INVALID_INPUT",
    "Choose existing main points without duplicates.",
  );
  return insights.filter((i) => ids.includes(i.id));
}
