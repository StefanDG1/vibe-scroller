import { backend, api } from "@/lib/backend";
import { signedObject } from "../../../../../../packages/providers/storage";
import type { Id } from "../../../../../../convex/_generated/dataModel";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const asset = await (
      await backend()
    ).query(api.assets.evidence, { id: (await params).id as Id<"assets"> });
    const url = signedObject(asset.key, "GET", 60);
    if (new URL(req.url).searchParams.get("inline") === "true") {
      if (asset.type !== "image/jpeg") throw new Error("Not an image");
      const image = await fetch(url, {
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!image.ok || !image.body) throw new Error("Unavailable");
      const reader = image.body.getReader(),
        chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const item = await reader.read();
          if (item.done) break;
          size += item.value.byteLength;
          if (size > 1000000) throw new Error("Frame limit");
          chunks.push(item.value);
        }
      } finally {
        await reader.cancel();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255)
        throw new Error("Invalid image");
      return new Response(bytes, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
          "X-Robots-Tag": "noindex",
          Vary: "Cookie",
        },
      });
    }
    if (new URL(req.url).searchParams.get("view") === "true")
      return new Response(null, {
        status: 302,
        headers: {
          Location: url,
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    return Response.json(
      { url },
      {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch {
    return Response.json({ error: "Evidence unavailable." }, { status: 404 });
  }
}
