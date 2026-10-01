import Link from "next/link";
import { Waypoints } from "lucide-react";
import { CookieSettings } from "./consent";
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-icon" aria-hidden="true">
        <Waypoints size={21} strokeWidth={1.8} />
      </span>
      VibeScroller
    </Link>
  );
}
export function SiteHeader() {
  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="Website">
        <Link href="/how-it-works">How it works</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/docs">Docs</Link>
        <Link className="primary" href="/app">
          Start your library
        </Link>
      </nav>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Brand />
      <p>Make scrolling productive.</p>
      <nav aria-label="Footer">
        {[
          "about",
          "contact",
          "status",
          "privacy",
          "terms",
          "cookies",
          "refunds",
          "acceptable-use",
          "copyright",
          "legal",
          "subprocessors",
          "dpa",
        ].map((p) => (
          <Link key={p} href={`/${p}`}>
            {p.replaceAll("-", " ")}
          </Link>
        ))}
        <a href="https://github.com/StefanDG1/vibe-scroller">MIT source</a>
        <CookieSettings />
      </nav>
      <small>
        EXPONENTIAL EDUCATION S.R.L. · Development preview. Live checkout is
        disabled.
      </small>
    </footer>
  );
}
export function PublicPage({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="public-content">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
