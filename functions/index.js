import { playerPage } from "./_lib/render.js";

// The bare domain shows the generic Odyssey page (referral code DIRECT).
export async function onRequestGet({ env }) {
  return new Response(playerPage(null, env), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
