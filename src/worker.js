// Odyssey creator pages: one Worker serves the builder, the API, the creator
// pages and the static assets in /public.
import { playerPage, pitchPage, notFound } from "./lib/render.js";
import { getCreator, listCreators, saveCreator, deleteCreator, kv } from "./lib/store.js";

const PROTECTED = /^\/(admin|api)(\/|$)/;
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });
const html = (body, status = 200, cache = "public, max-age=60") =>
  new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": cache } });

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Builder login: user "odyssey" (or ADMIN_USER), password = ADMIN_PASSWORD secret.
function authFail(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return new Response("Builder locked: add the ADMIN_PASSWORD secret in Cloudflare (Worker > Settings > Variables and Secrets).", { status: 503 });
  }
  const user = env.ADMIN_USER || "odyssey";
  const hdr = request.headers.get("Authorization") || "";
  if (hdr.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(hdr.slice(6)).split(":");
      if (safeEqual(u, user) && safeEqual(rest.join(":"), env.ADMIN_PASSWORD)) return null;
    } catch {}
  }
  return new Response("Login required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Odyssey creator builder", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const m = request.method;
  let r;

  if (PROTECTED.test(url.pathname)) {
    const fail = authFail(request, env);
    if (fail) return fail;
  }

  // API
  if (path === "/api/creators") {
    if (m === "GET") return json(await listCreators(env));
    if (m === "POST") {
      try { return json(await saveCreator(env, await request.json())); } catch (e) { return json({ error: e.message }, 400); }
    }
    return json({ error: "Method not allowed" }, 405);
  }
  if ((r = path.match(/^\/api\/creators\/([\w-]+)$/))) {
    if (m === "GET") { const c = await getCreator(env, r[1]); return c ? json(c) : json({ error: "Not found" }, 404); }
    if (m === "DELETE") { await deleteCreator(env, r[1]); return json({ ok: true }); }
    return json({ error: "Method not allowed" }, 405);
  }

  // Public pages
  if (m === "GET" || m === "HEAD") {
    if (path === "/") return html(playerPage(null, env), 200, "public, max-age=300");
    if ((r = path.match(/^\/c\/([\w-]+)$/))) {
      const c = await getCreator(env, r[1]);
      return c ? html(playerPage(c, env)) : html(notFound(), 404);
    }
    if ((r = path.match(/^\/c\/([\w-]+)\/pitch$/))) {
      const c = await getCreator(env, r[1]);
      const res = c ? html(pitchPage(c, env, url.origin), 200, "no-store") : html(notFound(), 404);
      res.headers.set("X-Robots-Tag", "noindex");
      return res;
    }
    if ((r = path.match(/^\/photo\/([\w-]+)$/))) {
      const { value, metadata } = await kv(env).getWithMetadata(`photo:${r[1]}`, { type: "arrayBuffer" });
      if (!value) return new Response("Not found", { status: 404 });
      return new Response(value, { headers: { "Content-Type": metadata?.type || "image/jpeg", "Cache-Control": "public, max-age=86400" } });
    }
    if (url.pathname === "/admin") return Response.redirect(url.origin + "/admin/", 301);
  }

  // Static files (builder page, logos, commitment graphics)
  const res = await env.ASSETS.fetch(request);
  return res.status === 404 && !path.includes(".") ? html(notFound(), 404) : res;
}

export default {
  async fetch(request, env) {
    try {
      const res = await route(request, env);
      if (PROTECTED.test(new URL(request.url).pathname)) {
        const out = new Response(res.body, res);
        out.headers.set("Cache-Control", "no-store");
        out.headers.set("X-Robots-Tag", "noindex");
        return out;
      }
      return res;
    } catch (e) {
      return new Response("Something went wrong: " + e.message, { status: 500 });
    }
  },
};
