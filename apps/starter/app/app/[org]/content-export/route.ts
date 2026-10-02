import { backend, api } from "@/lib/backend";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { contentExportSections } from "../../../../../../packages/privacy/export";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ org: string }> },
) {
  const client = await backend();
  const organizationId = (await params).org as Id<"organizations">;
  // Check permission before returning download headers. Every subsequent page checks again.
  const asOf = Date.now();
  const firstPage = await client
    .query(api.jobs.exportPage, {
      organizationId,
      section: "sources",
      cursor: null,
      asOf,
    })
    .catch(() => null);
  if (!firstPage)
    return new Response("Access denied or export unavailable.", {
      status: 403,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  const authorizedFirstPage = firstPage;
  async function* chunks() {
    yield `{"schemaVersion":"1.2.0","exportedAt":${asOf},"consistency":"Live records as read; new records after export start excluded"`;
    for (const section of contentExportSections) {
      yield `,"${section}":[`;
      let cursor: string | null = null;
      let first = true;
      do {
        if (request.signal.aborted) return;
        const result: typeof authorizedFirstPage =
          section === "sources" && cursor === null
            ? authorizedFirstPage
            : await client.query(api.jobs.exportPage, {
                organizationId,
                section,
                cursor,
                asOf,
              });
        for (const row of result.page) {
          yield `${first ? "" : ","}${JSON.stringify(row)}`;
          first = false;
        }
        cursor = result.isDone ? null : result.continueCursor;
      } while (cursor !== null);
      yield "]";
    }
    yield "}";
  }
  const iterator = chunks();
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const next = await iterator.next();
          if (next.done) controller.close();
          else controller.enqueue(encoder.encode(next.value));
        } catch (error) {
          // A failed or revoked export is an incomplete download, never a valid truncated JSON document.
          controller.error(error);
          await iterator.return(undefined);
        }
      },
      async cancel() {
        await iterator.return(undefined);
      },
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "attachment; filename=vibescroller-export.json",
      },
    },
  );
}
