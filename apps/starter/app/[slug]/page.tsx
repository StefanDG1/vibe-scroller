import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { PublicPage } from "@/components/site";
import Link from "next/link";
import pricing from "../../../../contracts/pricing.json";
const legal: Record<string, string> = {
  legal: "LEGAL-NOTICE",
  terms: "TERMS",
  privacy: "PRIVACY",
  cookies: "COOKIES",
  refunds: "REFUNDS",
  "acceptable-use": "ACCEPTABLE-USE",
  copyright: "COPYRIGHT",
  subprocessors: "SUBPROCESSORS",
  dpa: "DPA",
};
const pages: Record<string, { title: string; body: string[] }> = {
  "how-it-works": {
    title: "From saved idea to reviewed change",
    body: [
      "Capture a supported URL, permitted upload or supplied transcript. Unavailable sources stay saved with an actionable state.",
      "Analysis distinguishes sampled audiovisual evidence from text-only or metadata coverage. AI output is labeled and may need verification.",
      "Select repositories and confirm each business profile. Useful matches become reviewable proposals. No fit and already implemented remain valid results.",
      "Accept a proposal, edit its plan, and separately approve its repository, base commit, files, executor, funding route and ceiling.",
      "An isolated worker returns a patch and test report. Review before the trusted publisher creates a draft PR. GitHub is authoritative for merge or closure.",
    ],
  },
  about: {
    title: "Why VibeScroller exists",
    body: [
      "I kept finding useful videos about coding, AI, marketing, and business. I saved them because I wanted to use the ideas. But I could watch ten videos faster than I could apply one. VibeScroller is the system I wanted between saving something and building something from it.",
      "V1 focuses on a private library, evidence, project relevance, reviewed plans and draft pull requests. The operator is EXPONENTIAL EDUCATION S.R.L. No provider affiliation or legal review is claimed.",
    ],
  },
  docs: {
    title: "Get started with your library",
    body: [
      "Sign in with an email code or Google. Create a workspace. Use the library before connecting GitHub.",
      "Paste a source URL, upload permitted content, or provide a transcript. Text input does not imply audio or video analysis.",
      "Connect the VibeScroller GitHub App to selected repositories and confirm purpose, audience, goals, constraints and non-goals.",
      "Review processing quotes before spending credits. Local Codex and API-funded cloud execution have separate authorization and funding.",
      "Connections show actual setup state. Unavailable providers never trigger an automatic paid fallback.",
      "Telegram is deferred by the owner. Use the web inbox and in-app notifications; email needs a verified sender. Read the repository deployment guide for installation and release gates.",
    ],
  },
  status: {
    title: "Service status",
    body: [
      "Development preview. Live checkout is disabled.",
      "Product-specific provider integrations and execution isolation require staging verification. This page does not claim production availability.",
      "Contact contact@exponentialeducation.ro for support or a security report.",
    ],
  },
  contact: {
    title: "Talk to us",
    body: [
      "Support, rights requests and business enquiries: contact@exponentialeducation.ro.",
      "For a business pilot, include company, work email, team size, intended use and requirements. Do not send source media, credentials or financial details.",
      "No response SLA or enterprise functionality is promised during development.",
    ],
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: pages[slug]?.title ?? slug.replaceAll("-", " "),
    robots: { index: !legal[slug], follow: true },
    alternates: { canonical: `https://scroll.companynerve.com/${slug}` },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "pricing")
    return (
      <PublicPage>
        <h1>A clear allowance for the work you choose.</h1>
        <p>
          Proposed EUR catalogue. Consumer totals are tax inclusive where
          applicable. Live checkout is disabled pending official tax evidence
          and release verification.
        </p>
        <div className="price-grid">
          {Object.entries(pricing.tiers).map(([tier, p]) => (
            <article className="panel" key={tier}>
              <h2>{tier === "pro" ? "Pro" : "Starter"}</h2>
              <p className="price">
                €{p.monthly_price_eur}
                <small> billed monthly</small>
              </p>
              <p>€{p.weekly_price_eur} every 7 days</p>
              <p>
                €{p.annual_price_eur} billed once per year, equivalent to €
                {(p.annual_price_eur / 12).toFixed(2)} per month
              </p>
              <ul>
                <li>
                  {p.weekly_credits} weekly or {p.monthly_credits} monthly
                  credits
                </li>
                <li>
                  {pricing.limits[tier as "starter" | "pro"].repositories}{" "}
                  repositories
                </li>
                <li>
                  {
                    pricing.limits[tier as "starter" | "pro"]
                      .retained_storage_gb
                  }{" "}
                  GB retained storage
                </li>
                <li>Proposals, plans and draft PR workflow</li>
                <li>
                  Optional local execution and separately metered cloud
                  execution, when verified
                </li>
              </ul>
              <p className="status">Checkout unavailable</p>
            </article>
          ))}
        </div>
        <h2>Before payment</h2>
        <p>
          Annual credits replenish monthly. Included credits expire at the
          period boundary. Purchased credits are separate. Optional top-ups are
          €10 for 200 credits or €25 for 550 credits. No automatic top-ups or
          silent API fallback.
        </p>
        <p>
          The preview has 30 credits and up to 3 sources, with no automatic paid
          conversion. Provider inference and runtime costs are quoted before
          work.
        </p>
        <p>
          <Link href="/refunds">Refund and withdrawal policy</Link> ·{" "}
          <Link href="/terms">Terms draft</Link> ·{" "}
          <Link href="/contact">Business enquiry</Link>
        </p>
      </PublicPage>
    );
  if (legal[slug]) {
    const text = await readFile(
      join(process.cwd(), "content/legal", `${legal[slug]}.md`),
      "utf8",
    );
    return (
      <PublicPage>
        <p className="notice">
          Review draft · Not yet effective. No legal review is claimed.
        </p>
        <article className="policy-document">
          {text.split(/\n\s*\n/).map((s, i) =>
            s.startsWith("# ") ? (
              <h1 key={i}>{s.slice(2)}</h1>
            ) : s.startsWith("## ") ? (
              <h2 key={i}>{s.slice(3)}</h2>
            ) : (
              <p key={i} style={{ whiteSpace: "pre-wrap" }}>
                {s}
              </p>
            ),
          )}
        </article>
      </PublicPage>
    );
  }
  const p = pages[slug];
  if (!p) notFound();
  return (
    <PublicPage>
      <article className="prose">
        <h1>{p.title}</h1>
        {p.body.map((s) => (
          <p key={s}>{s}</p>
        ))}
        {slug === "contact" && (
          <a className="primary" href="mailto:contact@exponentialeducation.ro">
            Email support
          </a>
        )}
      </article>
    </PublicPage>
  );
}
