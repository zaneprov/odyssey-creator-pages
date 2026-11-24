// Creator records live in the Cloudflare KV namespace bound as CREATORS.
// creator:<slug> -> JSON record, photo:<slug> -> JPEG bytes.

export const slugify = (s) =>
  String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

export const refFrom = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "ODYSSEY";

export function kv(env) {
  if (!env.CREATORS) throw new Error("KV namespace CREATORS is not bound. Add it in Cloudflare Pages > Settings > Bindings.");
  return env.CREATORS;
}

export async function getCreator(env, slug) {
  const raw = await kv(env).get(`creator:${slug}`);
  return raw ? JSON.parse(raw) : null;
}

export async function listCreators(env) {
  const out = [];
  let cursor;
  do {
    const r = await kv(env).list({ prefix: "creator:", cursor });
    const vals = await Promise.all(r.keys.map((k) => kv(env).get(k.name)));
    vals.forEach((v) => v && out.push(JSON.parse(v)));
    cursor = r.list_complete ? undefined : r.cursor;
  } while (cursor);
  return out.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export async function saveCreator(env, input) {
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Name is required");
  const slug = slugify(input.slug || name);
  if (!slug) throw new Error("Could not make a link from that name");
  const prev = await getCreator(env, slug);
  if (prev && input.isNew) throw new Error(`A page already exists at /c/${slug}. Edit it, or change the link.`);
  const now = new Date().toISOString();
  const num = (v, d) => (v === "" || v == null || isNaN(Number(v)) ? d : Number(v));
  const rec = {
    slug,
    name,
    handle: String(input.handle || "").trim(),
    platform: String(input.platform || "").trim(),
    followers: String(input.followers || "").trim(),
    hook: String(input.hook || "").trim(),
    intro: String(input.intro || "").trim(),
    refCode: refFrom(input.refCode || name),
    commissionPct: num(input.commissionPct, 15),
    avgSale: num(input.avgSale, 3000),
    accent: /^#[0-9a-fA-F]{6}$/.test(input.accent || "") ? input.accent : "#4076e4",
    notes: String(input.notes || "").trim(),
    hasPhoto: prev?.hasPhoto || false,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  };
  if (input.photo === null) rec.hasPhoto = false;
  if (typeof input.photo === "string" && input.photo.startsWith("data:image/")) {
    const b64 = input.photo.split(",")[1];
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    if (bytes.length > 2_000_000) throw new Error("Photo is too large (max 2MB after resize)");
    await kv(env).put(`photo:${slug}`, bytes, { metadata: { type: input.photo.slice(5, input.photo.indexOf(";")) } });
    rec.hasPhoto = true;
  }
  if (!rec.hasPhoto) await kv(env).delete(`photo:${slug}`);
  await kv(env).put(`creator:${slug}`, JSON.stringify(rec));
  return rec;
}

export async function deleteCreator(env, slug) {
  await kv(env).delete(`creator:${slug}`);
  await kv(env).delete(`photo:${slug}`);
}
