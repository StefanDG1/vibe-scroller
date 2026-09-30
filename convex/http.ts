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
http.route({
  path: "/stripe/v1/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.text();
    if (body.length > 1000000)
      return new Response("Too large", { status: 413 });
    try {
      const result = await ctx.runAction(internal.reconciliation.stripeEvent, {
        body,
        signature: req.headers.get("stripe-signature") ?? "",
      });
      return new Response(result.status === 200 ? "ok" : "Invalid webhook", {
        status: result.status,
      });
    } catch {
      return new Response("Retry later", { status: 503 });
    }
  }),
});
http.route({
  path: "/github/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.text();
    if (body.length > 1000000)
      return new Response("Too large", { status: 413 });
    const result = await ctx.runAction(internal.githubEvents.webhook, {
      body,
      signature: req.headers.get("x-hub-signature-256") ?? "",
      delivery: req.headers.get("x-github-delivery") ?? "",
    });
    return new Response(result.status === 200 ? "ok" : "Invalid webhook", {
      status: result.status,
    });
  }),
});
http.route({
  path: "/resend/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { resend } = await import("./email");
    return resend.handleResendEventWebhook(ctx, req);
  }),
});
export default http;
