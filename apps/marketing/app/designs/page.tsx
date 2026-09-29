import { Header, Footer, RecipeGallery } from "@/components/site";
export const metadata = {
  title: "Five design directions",
  alternates: { canonical: "/designs" },
};
export default function Page() {
  return (
    <div className="container">
      <Header />
      <main id="main" className="section" style={{ border: 0 }}>
        <div className="section-head">
          <h1 style={{ fontSize: "3.5rem" }}>Choose a starting point.</h1>
          <p className="muted">
            Five landing-page directions for the same product. Open each option
            to compare its layout, tone, and presentation. The final choice is
            still yours.
          </p>
        </div>
        <RecipeGallery />
        <section className="section" style={{ marginTop: 50 }}>
          <h2>Our current starting point</h2>
          <p>
            Cobalt workshop is the selected CompanyNerve design. The other four
            remain available, and every recipe can be customized for a separate
            product.
          </p>
          <p className="muted">
            No vote is submitted or stored here. Tell your coding agent the name
            of the direction you prefer.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
