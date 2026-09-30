import Link from "next/link";
import { company } from "@companynerve/company-config";
export { RecipePicker } from "./recipe-picker";
export function Header() {
  return (
    <header className="topbar">
      <Link className="wordmark" href="/">
        {company.product.name}
      </Link>
      <nav className="navlinks" aria-label="Main">
        <Link href="/app">Workspace</Link>
        <Link href="/docs">Help</Link>
        <Link href="/account">Account</Link>
      </nav>
    </header>
  );
}
