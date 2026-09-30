"use client";
import { recipes } from "@companynerve/design-recipes";
import { Button, Select } from "@companynerve/ui";
export function RecipePicker() {
  return (
    <form
      className="actions"
      onSubmit={(event) => {
        event.preventDefault();
        const recipe = String(new FormData(event.currentTarget).get("recipe"));
        if (!recipes.some((value) => value.id === recipe)) return;
        document.documentElement.dataset.recipe = recipe;
        try {
          localStorage.setItem("vibescroller-design-recipe", recipe);
        } catch {
          /* The current preview still works without storage. */
        }
        window.dispatchEvent(new Event("vibescroller-recipe"));
      }}
    >
      <label htmlFor="recipe" className="sr-only">
        Design recipe
      </label>
      <Select id="recipe" name="recipe" style={{ width: 220 }}>
        {recipes.map((recipe) => (
          <option value={recipe.id} key={recipe.id}>
            {recipe.name}
          </option>
        ))}
      </Select>
      <Button variant="outline" type="submit">
        Apply recipe
      </Button>
    </form>
  );
}
