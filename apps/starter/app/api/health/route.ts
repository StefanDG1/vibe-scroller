export async function GET() {
  return Response.json(
    { status: "ok", service: "vibescroller" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
