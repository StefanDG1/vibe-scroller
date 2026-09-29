import Link from "next/link";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { backend, api } from "@/lib/backend";
import { Header } from "@/components/header";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const info = await (
    await backend()
  ).query(api.organizations.details, {
    organizationId: org as Id<"organizations">,
  });
  return (
    <div className="container">
      <Header />
      <div className="app-grid">
        <aside className="sidebar">
          <p className="muted" style={{ fontSize: ".8rem", padding: "0 12px" }}>
            {info.name}
          </p>
          <Link href={"/app/" + org}>Projects</Link>
          {info.role !== "member" && (
            <>
              <Link href={"/app/" + org + "/team"}>Team</Link>
              <Link href={"/app/" + org + "/settings"}>Settings</Link>
              <Link href={"/app/" + org + "/audit"}>Activity</Link>
              <Link href={"/app/" + org + "/launch-checks"}>
                Launch checks setup
              </Link>
            </>
          )}
          {info.role === "owner" && (
            <Link href={"/app/" + org + "/billing"}>Billing</Link>
          )}
          <Link href="/app">Switch workspace</Link>
        </aside>
        <main className="app-main" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
