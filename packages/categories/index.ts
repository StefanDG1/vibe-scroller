export const starterCategories = [
  ["coding", "Coding", ["software development", "programming"]],
  ["ai", "AI", ["artificial intelligence", "machine learning"]],
  ["video_editing", "Video editing", ["video production"]],
  ["sales", "Sales", []],
  ["business_operations", "Business operations", ["operations"]],
  ["marketing", "Marketing", ["branding", "brand strategy"]],
  [
    "product_design",
    "Product design",
    ["ui design", "ux design", "design systems"],
  ],
  ["general_advice", "General advice", []],
  ["music", "Music", ["music production", "dj mixing"]],
  ["reading", "Reading", ["books", "book recommendations"]],
  ["personal_development", "Personal development", ["self improvement"]],
  ["education", "Education", ["learning", "teaching"]],
] as const;
export type Vocabulary = {
  key: string;
  name: string;
  aliases: readonly string[];
};
export const defaultVocabulary: Vocabulary[] = starterCategories.map(
  ([key, name, aliases]) => ({ key, name, aliases }),
);
export function categoryName(value: string) {
  const name = value
    .normalize("NFKC")
    .trim()
    .replace(/[_\s]+/g, " ");
  if (!/^[\p{L}\p{N}][\p{L}\p{N} &+/-]{0,47}$/u.test(name))
    throw new Error(
      "Use a category name of 1 to 48 letters, numbers or spaces.",
    );
  return name;
}
export const categoryKey = (value: string) =>
  categoryName(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/_+$/u, "");
export function resolveCategories(names: string[], vocabulary: Vocabulary[]) {
  const aliases = new Map<string, Vocabulary>();
  // Workspace names take precedence over the shared vocabulary.
  for (const category of vocabulary)
    for (const alias of [category.key, category.name, ...category.aliases])
      aliases.set(categoryKey(alias), category);
  const result = new Map<string, Vocabulary>();
  for (const value of names.slice(0, 40)) {
    if (value === "other") continue;
    let name: string;
    try {
      name = categoryName(value);
    } catch {
      continue;
    }
    const key = categoryKey(name);
    const category = aliases.get(key) ?? { key, name, aliases: [] };
    result.set(category.key, category);
    if (result.size === 8) break;
  }
  return [...result.values()];
}
export function analysisCategoryNames(source: any, analysis: any) {
  if (source.categoryOverride) return source.categoryOverride;
  const names = (analysis?.insights ?? []).flatMap((insight: any) => [
    ...(insight.topics ?? []),
    ...(insight.categories ?? []),
  ]);
  // Existing analysis has no topics. Recognize only these explicit topic words;
  // do not invent semantic matches or re-run paid inference for a migration.
  if (!(analysis?.insights ?? []).some((i: any) => i.topics?.length)) {
    const text = `${source.title} ${analysis?.summary ?? ""}`.toLowerCase();
    if (/\b(music|mixing|dj)\b/.test(text)) names.unshift("Music");
    if (/\b(books?|reading)\b/.test(text)) names.unshift("Reading");
  }
  return names;
}
