// Creator records live in the Cloudflare KV namespace bound as CREATORS.
// creator:<slug> -> JSON record, photo:<slug> / logo:<slug> -> image bytes.

export const slugify = (s) =>
  String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

export const refFrom = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "ODYSSEY";

const hex = (v) => (/^#[0-9a-fA-F]{6}$/.test(String(v || "").trim()) ? String(v).trim().toLowerCase() : "");

export function kv(env) {
  if (!env.CREATORS) throw new Error("KV namespace CREATORS is not bound. Check the kv_namespaces block in wrangler.toml.");
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
    accent: hex(input.accent) || "#4076e4",
    website: String(input.website || "").trim(),
    brandColor: hex(input.brandColor),
    brandDark: hex(input.brandDark),
    notes: String(input.notes || "").trim(),
    hasPhoto: prev?.hasPhoto || false,
    hasLogo: prev?.hasLogo || false,
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  };
  for (const kind of ["photo", "logo"]) {
    const flag = kind === "photo" ? "hasPhoto" : "hasLogo";
    const v = input[kind];
    if (v === null) rec[flag] = false;
    if (typeof v === "string" && v.startsWith("data:image/")) {
      const bytes = Uint8Array.from(atob(v.split(",")[1]), (c) => c.charCodeAt(0));
      if (bytes.length > 3_000_000) throw new Error(`The ${kind} is too large (max 3MB after resize)`);
      await kv(env).put(`${kind}:${slug}`, bytes, { metadata: { type: v.slice(5, v.indexOf(";")) } });
      rec[flag] = true;
    }
    if (!rec[flag]) await kv(env).delete(`${kind}:${slug}`);
  }
  await kv(env).put(`creator:${slug}`, JSON.stringify(rec));
  return rec;
}

export async function deleteCreator(env, slug) {
  await kv(env).delete(`creator:${slug}`);
  await kv(env).delete(`photo:${slug}`);
  await kv(env).delete(`logo:${slug}`);
}
