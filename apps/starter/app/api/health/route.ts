export async function GET() {
  return Response.json(
    {
      status: "ok",
      service: "vibescroller",
      version: process.env.NEXT_PUBLIC_APP_VERSION,
      commit: process.env.NEXT_PUBLIC_APP_COMMIT,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
