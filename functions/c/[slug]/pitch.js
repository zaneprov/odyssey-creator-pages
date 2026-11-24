import { getCreator } from "../../_lib/store.js";
import { pitchPage, notFound } from "../../_lib/render.js";

const HTML = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function onRequestGet({ env, params, request }) {
  const c = await getCreator(env, params.slug);
  if (!c) return new Response(notFound(), { status: 404, headers: HTML });
  return new Response(pitchPage(c, env, new URL(request.url).origin), { headers: HTML });
}
