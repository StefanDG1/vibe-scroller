import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
const http = httpRouter();
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const signature = req.headers.get("stripe-signature");
    if (!signature) return new Response("Missing signature", { status: 400 });
    const body = await req.text();
    if (body.length > 1000000)
      return new Response("Payload too large", { status: 413 });
    try {
      const result = await ctx.runAction(internal.payments.webhook, {
        body,
        signature,
      });
      return new Response(result.status === 200 ? "ok" : "Invalid webhook", {
        status: result.status,
      });
    } catch {
      return new Response("Retry later", { status: 500 });
    }
  }),
});
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(
    async () =>
      new Response(
        JSON.stringify({ status: "ok", service: "companynerve-starter" }),
        { headers: { "Content-Type": "application/json" } },
      ),
  ),
});
export default http;
