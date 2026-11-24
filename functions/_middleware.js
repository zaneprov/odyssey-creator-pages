// Protects the builder (/admin) and its API (/api) with one shared password.
// Set ADMIN_PASSWORD (and optionally ADMIN_USER, default "odyssey") as an
// encrypted environment variable in Cloudflare Pages > Settings.

const PROTECTED = /^\/(admin|api)(\/|$)/;

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  const url = new URL(request.url);
  if (!PROTECTED.test(url.pathname)) return next();
  if (!env.ADMIN_PASSWORD) {
    return new Response("Builder locked: set ADMIN_PASSWORD in Cloudflare Pages settings, then redeploy.", { status: 503 });
  }
  const user = env.ADMIN_USER || "odyssey";
  const hdr = request.headers.get("Authorization") || "";
  let ok = false;
  if (hdr.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(hdr.slice(6)).split(":");
      ok = safeEqual(u, user) && safeEqual(rest.join(":"), env.ADMIN_PASSWORD);
    } catch {}
  }
  if (!ok) {
    return new Response("Login required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Odyssey creator builder", charset="UTF-8"', "Cache-Control": "no-store" },
    });
  }
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set("Cache-Control", "no-store");
  out.headers.set("X-Robots-Tag", "noindex");
  return out;
}
