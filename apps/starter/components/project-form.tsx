import { ActionForm } from "./action-form";
import { saveProject, removeProject } from "@/app/actions";
import { Input, Label, Textarea, Card } from "@companynerve/ui";
export function ProjectForm({
  organizationId,
  project,
}: {
  organizationId: string;
  project?: { _id: string; name: string; description: string };
}) {
  return (
    <div className="stack">
      <Card>
        <ActionForm
          action={saveProject}
          label={project ? "Save project" : "Create project"}
        >
          <input type="hidden" name="organizationId" value={organizationId} />
          {project && <input type="hidden" name="id" value={project._id} />}
          <div>
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={project?.name}
              required
              maxLength={80}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={project?.description}
              maxLength={2000}
            />
          </div>
        </ActionForm>
      </Card>
      {project && (
        <Card>
          <h3>Delete this project</h3>
          <p className="muted">
            This removes the project. Type DELETE to confirm.
          </p>
          <ActionForm action={removeProject} label="Delete project" danger>
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="id" value={project._id} />
            <Label htmlFor="confirmation">Confirmation</Label>
            <Input
              id="confirmation"
              name="confirmation"
              required
              pattern="DELETE"
            />
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
