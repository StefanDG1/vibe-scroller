// Reviewed navigation vocabulary. Private source content is never shared to
// train or promote a category; specific topics remain workspace vocabulary.
export const domains = [
  {
    key: "domain_business",
    name: "Business",
    topics: ["business_operations", "marketing", "sales"],
    words:
      /\b(business|marketing|sales|entrepreneur|founder|advertising|branding|ecommerce)\b/i,
  },
  {
    key: "domain_coding",
    name: "Coding",
    topics: ["coding", "ai"],
    words:
      /\b(coding|programming|software|github|javascript|typescript|developer|machine learning)\b/i,
  },
  {
    key: "domain_design",
    name: "Design",
    topics: ["product_design"],
    words: /\b(design|typography|interface|accessibility|ux|ui)\b/i,
  },
  {
    key: "domain_media",
    name: "Media & music",
    topics: ["video_editing", "music"],
    words:
      /\b(video editing|filmmaking|photography|music|sound design|animation|cinematography)\b/i,
  },
  {
    key: "domain_food",
    name: "Food",
    topics: [],
    words: /\b(food|cooking|baking|recipe|cuisine|nutrition|meal|chef)\b/i,
  },
  {
    key: "domain_fashion",
    name: "Fashion",
    topics: [],
    words: /\b(fashion|styling|outfit|clothing|wardrobe|beauty|makeup)\b/i,
  },
  {
    key: "domain_health",
    name: "Health & fitness",
    topics: [],
    words:
      /\b(fitness|health|exercise|workout|wellness|medical|strength training)\b/i,
  },
  {
    key: "domain_lifestyle",
    name: "Lifestyle",
    topics: ["personal_development"],
    words:
      /\b(lifestyle|travel|home|relationships|self improvement|personal development)\b/i,
  },
  {
    key: "domain_learning",
    name: "Learning",
    topics: ["education", "reading"],
    words: /\b(education|learning|teaching|reading|books|history|science)\b/i,
  },
  { key: "domain_other", name: "Other", topics: [], words: /$a/ },
] as const;
export function categoryDomains(categories: { key: string; name: string }[]) {
  const matches = domains.filter(
    (d) =>
      d.key !== "domain_other" &&
      categories.some(
        (c) => d.topics.some((t) => t === c.key) || d.words.test(c.name),
      ),
  );
  return matches.length ? matches.slice(0, 3) : [domains[domains.length - 1]];
}
