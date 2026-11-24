import { getCreator } from "../../_lib/store.js";
import { playerPage, notFound } from "../../_lib/render.js";

const HTML = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=60" };

export async function onRequestGet({ env, params }) {
  const c = await getCreator(env, params.slug);
  if (!c) return new Response(notFound(), { status: 404, headers: HTML });
  return new Response(playerPage(c, env), { headers: HTML });
}
