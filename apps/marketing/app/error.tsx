"use client";
import { Button } from "@companynerve/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="narrow">
      <h1>Something needs attention</h1>
      <p>We could not load this page. Try again or return home.</p>
      <Button onClick={reset}>Try again</Button>
      <p>
        <a href="/">Return home</a>
      </p>
    </main>
  );
}
