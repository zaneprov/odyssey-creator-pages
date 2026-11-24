import { listCreators, saveCreator } from "../../_lib/store.js";

const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });

export async function onRequestGet({ env }) {
  try { return json(await listCreators(env)); } catch (e) { return json({ error: e.message }, 500); }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    return json(await saveCreator(env, body));
  } catch (e) {
    return json({ error: e.message }, 400);
  }
}
