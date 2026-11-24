import { kv } from "../_lib/store.js";

export async function onRequestGet({ env, params }) {
  const { value, metadata } = await kv(env).getWithMetadata(`photo:${params.slug}`, { type: "arrayBuffer" });
  if (!value) return new Response("Not found", { status: 404 });
  return new Response(value, {
    headers: { "Content-Type": metadata?.type || "image/jpeg", "Cache-Control": "public, max-age=86400" },
  });
}
