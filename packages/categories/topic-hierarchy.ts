// Authored filing vocabulary, not an inferred fact, model call or permission.
// Unknown labels remain Unsorted; user corrections always outrank this default.
export function topicCategoryPath(name: string): string[] {
  const label = name.toLowerCase().replace(/[_-]/g, " ");
  const rules: [RegExp, string[]][] = [
    [
      /interface|customer experience|onboard|ux|usability|design system|product design/,
      ["Business", "Product"],
    ],
    [
      /pricing|monetiz|subscription|revenue/,
      ["Business", "Product", "Pricing"],
    ],
    [
      /conversion|trust|sales|growth/,
      ["Business", "Marketing", "Conversion and trust"],
    ],
    [
      /content|brand|marketing|video editing/,
      ["Business", "Marketing", "Content strategy"],
    ],
    [
      /\bai\b|automation|agent|workflow/,
      ["Business", "Engineering", "AI and automation"],
    ],
    [
      /code|coding|software|program|architecture|developer/,
      ["Business", "Engineering", "Software development"],
    ],
    [
      /evidence|verif|security|privacy|risk|quality|test/,
      ["Business", "Engineering", "Quality and verification"],
    ],
    [/business|operations|team|management/, ["Business", "Operations"]],
    [/health|fitness|exercise|nutrition|wellbeing/, ["Personal", "Wellbeing"]],
    [
      /learning|education|reading|book|personal development|self improvement/,
      ["Personal", "Learning and growth"],
    ],
    [/music|travel|hobby|cooking|creative/, ["Personal", "Interests"]],
  ];
  return rules.find(([pattern]) => pattern.test(label))?.[1] ?? ["Unsorted"];
}
