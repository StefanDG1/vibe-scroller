import Link from "next/link";
import { backend, api } from "@/lib/backend";
import { ActionForm } from "@/components/action-form";
import { recordInvoiceReceipt } from "@/app/actions";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const c = await backend();
  const access = await c.query(api.invoiceOperations.status, {});
  if (!access.allowed)
    return (
      <main id="main" className="doc">
        <Link href="/account">Back to account</Link>
        <h1>Invoice operator access required</h1>
        <p>
          This queue is available to explicitly authorized company invoice
          operators.
        </p>
      </main>
    );
  const { cursor } = await searchParams;
  const queue = await c.query(api.invoiceOperations.queue, {
    paginationOpts: { cursor: cursor ?? null, numItems: 20 },
  });
  return (
    <main id="main" className="doc" style={{ overflowWrap: "anywhere" }}>
      <Link href="/account">Back to account</Link>
      <h1>Invoice reporting queue</h1>
      <p>
        {queue.mode === "test"
          ? "Sandbox records. No live invoices are issued here."
          : "Live billing records."}
      </p>
      <p>
        Use the accountant's Oblio workflow for applicable invoices. This page
        records a submission reference; it does not create invoices, send them
        to ANAF or verify acceptance. Reconcile corrections with the accountant
        while retaining the original record.
      </p>
      {queue.page.length === 0 && (
        <p>No invoice reporting tasks on this page.</p>
      )}
      {queue.page.map((task) => (
        <section key={task._id} className="panel stack">
          <h2>Invoice {task.invoiceId}</h2>
          <p>Workspace: {task.organizationId}</p>
          <a href={`/api/accounting/${task._id}`} download>
            Download accountant record
          </a>
          <p>
            Reporting deadline: {new Date(task.dueAt).toISOString()} UTC ·{" "}
            {task.state === "submitted"
              ? "Submission reference recorded"
              : task.dueAt < queue.observedAt
                ? "Overdue; review with accountant"
                : "Awaiting submission reference"}
          </p>
          <a
            href={`https://dashboard.stripe.com/${queue.mode === "test" ? "test/" : ""}invoices/${encodeURIComponent(task.invoiceId)}`}
            rel="noreferrer"
          >
            Inspect source invoice in Stripe
          </a>
          {task.receipt ? (
            <p>Recorded reference: {task.receipt}</p>
          ) : (
            <ActionForm
              action={recordInvoiceReceipt}
              label="Record submission reference"
            >
              <input type="hidden" name="invoiceTaskId" value={task._id} />
              <label>
                Actual submission receipt reference
                <input
                  name="receipt"
                  required
                  minLength={10}
                  maxLength={999}
                  autoComplete="off"
                />
              </label>
              <p>
                You may need to sign in again before recording a reference. Use
                evidence supplied by the accountant after submission.
              </p>
            </ActionForm>
          )}
        </section>
      ))}
      {!queue.isDone && (
        <Link
          href={`/account/invoices?cursor=${encodeURIComponent(queue.continueCursor)}`}
          prefetch={false}
        >
          Next page
        </Link>
      )}
    </main>
  );
}
