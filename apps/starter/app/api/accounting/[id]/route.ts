import { backend, api } from "@/lib/backend";
import type { Id } from "../../../../../../convex/_generated/dataModel";
const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex",
  Vary: "Cookie",
};
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await (
      await backend()
    ).action(api.invoiceAccounting.download, {
      id: (await params).id as Id<"invoiceTasks">,
    });
    return Response.json(result, {
      headers: {
        ...headers,
        "Content-Disposition": `attachment; filename="accountant-${result.invoice.id.replace(/[^a-zA-Z0-9_-]/g, "")}.json"`,
      },
    });
  } catch {
    return Response.json(
      { error: "Invoice record unavailable." },
      { status: 404, headers },
    );
  }
}
