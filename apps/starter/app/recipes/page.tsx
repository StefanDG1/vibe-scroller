import { Header, RecipePicker } from "@/components/header";
import { recipes } from "@companynerve/design-recipes";
import { Card, Input, Label, Button, Badge } from "@companynerve/ui";
export default function Page() {
  return (
    <div className="container">
      <Header />
      <main id="main" className="section" style={{ border: 0 }}>
        <h1 style={{ fontSize: "3rem" }}>A design you can make your own.</h1>
        <p className="muted">
          Apply a recipe to preview the entire app in this browser. The visual
          direction can change without changing the product's behavior.
        </p>
        <RecipePicker />
        <div className="recipe-grid" style={{ marginTop: 35 }}>
          {recipes.map((r) => (
            <Card
              key={r.id}
              style={{ background: r.bg, color: r.color, padding: 20 }}
            >
              <h3>{r.name}</h3>
              <p style={{ fontSize: ".8rem" }}>{r.description}</p>
            </Card>
          ))}
        </div>
        <section className="section split" style={{ marginTop: 50 }}>
          <Card>
            <h2>Form and feedback</h2>
            <Label htmlFor="sample-name">Project name</Label>
            <Input id="sample-name" placeholder="Research workspace" />
            <div className="actions">
              <Button type="button" disabled>
                Preview button
              </Button>
              <Badge>Example</Badge>
            </div>
            <p className="error" style={{ marginTop: 25 }}>
              Example error: enter a project name.
            </p>
            <p className="success">Example success: project saved.</p>
          </Card>
          <Card>
            <h2>An empty workspace.</h2>
            <p className="muted">
              When the app has no projects, it explains the next useful action.
            </p>
            <p className="muted">
              These are visual examples. They do not save data or simulate a
              signed-in user.
            </p>
          </Card>
        </section>
      </main>
    </div>
  );
}
