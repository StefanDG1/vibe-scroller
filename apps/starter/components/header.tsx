import Link from "next/link";
import { company } from "@companynerve/company-config";
import { recipes } from "@companynerve/design-recipes";
import { Button, Select } from "@companynerve/ui";
import { changeRecipe } from "@/app/actions";
export function Header() {
  return (
    <header className="topbar">
      <Link className="wordmark" href="/">
        {company.product.name}
      </Link>
      <nav className="navlinks" aria-label="Main">
        <Link href="/app">Workspace</Link>
        <Link href="/recipes">Designs</Link>
        <Link href="/account">Account</Link>
      </nav>
    </header>
  );
}
export function RecipePicker() {
  return (
    <form action={changeRecipe} className="actions">
      <label htmlFor="recipe" className="sr-only">
        Design recipe
      </label>
      <Select id="recipe" name="recipe" style={{ width: 220 }}>
        {recipes.map((r) => (
          <option value={r.id} key={r.id}>
            {r.name}
          </option>
        ))}
      </Select>
      <Button variant="outline" type="submit">
        Apply recipe
      </Button>
    </form>
  );
}
