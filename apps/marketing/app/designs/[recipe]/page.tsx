import { Landing } from "@/components/site";
import { recipes } from "@companynerve/design-recipes";
import { notFound } from "next/navigation";
export function generateStaticParams() {
  return recipes.map((r) => ({ recipe: r.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ recipe: string }>;
}) {
  const { recipe } = await params;
  return {
    title: recipes.find((r) => r.id === recipe)?.name ?? "Design option",
    robots: { index: false, follow: true },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ recipe: string }>;
}) {
  const { recipe } = await params;
  if (!recipes.some((r) => r.id === recipe)) notFound();
  return <Landing recipe={recipe} concept />;
}
