import { ProjectForm } from "@/components/project-form";
export default async function Page({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  return (
    <>
      <h1>New project</h1>
      <ProjectForm organizationId={org} />
    </>
  );
}
