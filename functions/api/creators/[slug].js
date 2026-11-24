import { getCreator, deleteCreator } from "../../_lib/store.js";

const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });

export async function onRequestGet({ env, params }) {
  const c = await getCreator(env, params.slug);
  return c ? json(c) : json({ error: "Not found" }, 404);
}

export async function onRequestDelete({ env, params }) {
  await deleteCreator(env, params.slug);
  return json({ ok: true });
}
