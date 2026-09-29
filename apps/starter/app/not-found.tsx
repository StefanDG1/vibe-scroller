import Link from "next/link";
export default function NotFound() {
  return (
    <main className="narrow">
      <h1>Page not found</h1>
      <p>The link may have changed.</p>
      <Link href="/">Return home</Link>
    </main>
  );
}
