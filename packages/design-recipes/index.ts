export const recipes = [
  {
    id: "cobalt",
    name: "Cobalt workshop",
    description: "Precise, practical, and quietly confident.",
    audience: "B2B tools and founder software",
    color: "#2456d8",
    bg: "#f7f9fc",
    font: "Arial, sans-serif",
    headline: "Make room for the product only you can build.",
    layout: "Split product introduction with a working-space preview.",
  },
  {
    id: "studio",
    name: "Quiet studio",
    description: "Generous space and a product-first presentation.",
    audience: "Studios, agencies, and focused tools",
    color: "#34383d",
    bg: "#ffffff",
    font: "Arial, sans-serif",
    headline: "A considered start. A product of your own.",
    layout: "Centered typographic opening and a wide product canvas.",
  },
  {
    id: "signal",
    name: "Signal room",
    description: "Compact, technical, and built around clear states.",
    audience: "Developer tools and infrastructure",
    color: "#7cafff",
    bg: "#152239",
    font: "Arial, sans-serif",
    headline: "Start with the parts that need to work.",
    layout: "Left-rail navigation with dense operational rows.",
  },
  {
    id: "garden",
    name: "Open garden",
    description: "Welcoming, spacious, and easy to follow.",
    audience: "Education and community products",
    color: "#236854",
    bg: "#f3f8f3",
    font: "Trebuchet MS, sans-serif",
    headline: "Give your next idea a place to grow.",
    layout: "Friendly introduction with staggered, spacious feature sections.",
  },
  {
    id: "folio",
    name: "Field notes",
    description: "A readable, editorial home for complex ideas.",
    audience: "Research, knowledge, and professional services",
    color: "#763c68",
    bg: "#fbf9fc",
    font: "Georgia, serif",
    headline: "Good foundations leave room for original work.",
    layout:
      "Asymmetric editorial title, explanatory copy, and chapter-like sections.",
  },
] as const;
export type RecipeId = (typeof recipes)[number]["id"];
export function getRecipe(id: string) {
  return recipes.find((r) => r.id === id) ?? recipes[0];
}
