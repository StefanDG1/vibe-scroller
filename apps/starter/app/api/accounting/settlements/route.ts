import { backend, api } from "@/lib/backend";
const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex",
  Vary: "Cookie",
};
export async function GET(req: Request) {
  try {
    const month = new URL(req.url).searchParams.get("month") ?? "";
    const result = await (
      await backend()
    ).action(api.settlementAccounting.download, { month });
    return Response.json(result, {
      headers: {
        ...headers,
        "Content-Disposition": `attachment; filename="provider-settlements-${result.month}.json"`,
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "Accounting export unavailable. Sign in again and check operator access and provider configuration.",
      },
      { status: 403, headers },
    );
  }
}
