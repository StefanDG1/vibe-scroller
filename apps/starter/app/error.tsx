"use client";
import Link from "next/link";
import { Button } from "@companynerve/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="narrow">
      <h1>Something needs attention</h1>
      <p>We could not load this page. Try again or return home.</p>
      <Button onClick={reset}>Try again</Button>
      <p>
        <Link href="/">Return home</Link>
      </p>
    </main>
  );
}
