import { company } from "@companynerve/company-config";
import { Button } from "@companynerve/ui";
import { getRecipe } from "@companynerve/design-recipes";
import { Header, Footer, ProductPreview } from "./site";

export function ProductLanding() {
  const recipe = getRecipe(company.brandRecipe);
  return (
    <div data-recipe={recipe.id}>
      <div className="container">
        <Header />
        <main id="main">
          <section className="hero">
            <div>
              <p className="intro">{company.product.name}</p>
              <h1>A workspace for work that matters.</h1>
              <p>{company.product.description}</p>
              <div className="actions">
                <Button asChild>
                  <a href={company.website.appUrl + "/sign-up"}>
                    Create an account
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={company.website.appUrl + "/sign-in"}>Sign in</a>
                </Button>
              </div>
            </div>
            <ProductPreview />
          </section>
          <section className="section" id="included">
            <h2>Keep your team and its work together.</h2>
            <p>
              Create a workspace, invite your team, and manage projects with
              owner, admin, and member permissions.
            </p>
            <p>
              Start on the Free plan. Your account and organization data can be
              exported from the application.
            </p>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
