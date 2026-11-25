// "Pull from website": read a creator's site (and try their Instagram) and
// return candidate logos, photos and brand colours for the builder to offer.
// Everything here is best effort; the builder always lets you pick or upload.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_HTML = 2_000_000;

export function normalizeUrl(raw) {
  let s = String(raw || "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol) ? u : null;
  } catch {
    return null;
  }
}

async function getText(url, limit = MAX_HTML) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,text/css,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" },
    redirect: "follow",
    cf: { cacheTtl: 300 },
  });
  if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}`);
  const text = await res.text();
  return { text: text.slice(0, limit), finalUrl: res.url || url, type: res.headers.get("content-type") || "" };
}

const abs = (v, base) => {
  if (!v) return null;
  v = String(v).trim().split(/\s+/)[0];
  if (!v || v.startsWith("data:") || v.startsWith("blob:")) return null;
  try {
    const u = new URL(v, base);
    return /^https?:$/.test(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
};

const LOGOISH = /logo|brand|wordmark|site-?title|header-?title|emblem|crest/i;
const JUNK = /pixel|tracking|spacer|blank\.|1x1|gravatar|badge|sprite|loader|spinner|facebook\.com\/tr|doubleclick|analytics|emoji/i;

// --- colours -------------------------------------------------------------
function toHex(r, g, b) {
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
}
function parseColor(c) {
  c = c.trim().toLowerCase();
  let m;
  if ((m = c.match(/^#([0-9a-f]{3})$/))) return "#" + [...m[1]].map((x) => x + x).join("");
  if ((m = c.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/))) return "#" + m[1];
  if ((m = c.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/))) return toHex(+m[1], +m[2], +m[3]);
  return null;
}
export function hsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
function rankColors(texts, priority) {
  const counts = new Map();
  const bump = (hex, w) => counts.set(hex, (counts.get(hex) || 0) + w);
  for (const t of texts) {
    const re = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])|rgba?\([^)]*\)/g;
    let m;
    while ((m = re.exec(t))) {
      const hex = parseColor(m[0]);
      if (hex) bump(hex, 1);
    }
  }
  priority.forEach((c) => { const hex = parseColor(c); if (hex) bump(hex, 1000); });
  // Keep colours that read as a brand colour: some saturation, not near white/black.
  const brandy = [...counts.entries()]
    .filter(([hex]) => { const { s, l } = hsl(hex); return s > 0.25 && l > 0.12 && l < 0.88; })
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);
  // Drop near-duplicates (same hue family and lightness).
  const out = [];
  for (const hex of brandy) {
    const a = hsl(hex);
    if (!out.some((o) => { const b = hsl(o); return Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h)) < 14 && Math.abs(a.l - b.l) < 0.12; })) out.push(hex);
    if (out.length >= 8) break;
  }
  return out;
}

// --- website -------------------------------------------------------------
export async function scrapeSite(rawUrl) {
  const u = normalizeUrl(rawUrl);
  if (!u) throw new Error("That website address doesn't look right");
  const { text, finalUrl } = await getText(u.toString());
  const base = finalUrl;

  const meta = {};
  const icons = [];
  const imgs = [];
  const styles = [];
  const sheets = [];
  const ld = [];
  let title = "";
  let curStyle = null, curLd = null, inHeader = 0;

  const rw = new HTMLRewriter()
    .on("title", { text(t) { title += t.text; } })
    .on("meta", {
      element(e) {
        const k = (e.getAttribute("property") || e.getAttribute("name") || "").toLowerCase();
        const v = e.getAttribute("content");
        if (k && v && !(k in meta)) meta[k] = v;
      },
    })
    .on("link", {
      element(e) {
        const rel = (e.getAttribute("rel") || "").toLowerCase();
        const href = abs(e.getAttribute("href"), base);
        if (!href) return;
        if (/icon/.test(rel)) icons.push({ url: href, size: parseInt(e.getAttribute("sizes") || "0", 10) || (/apple/.test(rel) ? 180 : 32) });
        if (/stylesheet/.test(rel) && sheets.length < 4) sheets.push(href);
      },
    })
    .on("header, [class*=header], [id*=header], nav", {
      element(e) { inHeader++; e.onEndTag(() => { inHeader--; }); },
    })
    .on("img, source", {
      element(e) {
        const src =
          abs(e.getAttribute("src"), base) ||
          abs(e.getAttribute("data-src"), base) ||
          abs(e.getAttribute("data-image"), base) ||
          abs((e.getAttribute("srcset") || e.getAttribute("data-srcset") || "").split(",").pop(), base);
        if (!src || JUNK.test(src)) return;
        const hint = [e.getAttribute("alt"), e.getAttribute("class"), e.getAttribute("id"), src.split("?")[0].split("/").pop()].join(" ");
        const w = parseInt(e.getAttribute("width") || "0", 10);
        if (w && w < 40) return;
        imgs.push({ url: src, logo: LOGOISH.test(hint), header: inHeader > 0, w });
      },
    })
    .on("[style]", { element(e) { styles.push(e.getAttribute("style")); const bg = (e.getAttribute("style") || "").match(/url\(['"]?([^'")]+)/); if (bg) { const s = abs(bg[1], base); if (s && !JUNK.test(s)) imgs.push({ url: s, logo: false, header: inHeader > 0, w: 0 }); } } })
    .on("style", { element() { curStyle = []; }, text(t) { if (curStyle) { curStyle.push(t.text); if (t.lastInTextNode) { styles.push(curStyle.join("")); curStyle = null; } } } })
    .on('script[type="application/ld+json"]', { element() { curLd = []; }, text(t) { if (curLd) { curLd.push(t.text); if (t.lastInTextNode) { ld.push(curLd.join("")); curLd = null; } } } });
  await rw.transform(new Response(text, { headers: { "Content-Type": "text/html" } })).text();

  // Structured-data logo (common on Squarespace, Wix, Shopify).
  const ldLogos = [];
  for (const block of ld) {
    for (const m of block.matchAll(/"logo"\s*:\s*(?:\{[^}]*?"url"\s*:\s*)?"([^"]+)"/g)) {
      const s = abs(m[1].replace(/\\\//g, "/"), base);
      if (s) ldLogos.push(s);
    }
  }

  // Stylesheets for colours (first few only).
  const cssTexts = await Promise.all(
    sheets.slice(0, 3).map((h) => getText(h, 400_000).then((r) => r.text).catch(() => ""))
  );
  const priority = [meta["theme-color"], meta["msapplication-tilecolor"]].filter(Boolean);
  const colors = rankColors([...styles, ...cssTexts], priority);

  const seen = new Set();
  const uniq = (list) => list.filter((x) => x && !seen.has(x.url) && seen.add(x.url));

  const logos = uniq([
    ...imgs.filter((i) => i.logo && i.header).map((i) => ({ url: i.url, why: "Header logo" })),
    ...imgs.filter((i) => i.logo && !i.header).map((i) => ({ url: i.url, why: "Logo on site" })),
    ...ldLogos.map((url) => ({ url, why: "Site logo" })),
    ...icons.sort((a, b) => b.size - a.size).filter((i) => i.size >= 96).map((i) => ({ url: i.url, why: "App icon" })),
  ]).slice(0, 8);

  const photos = uniq([
    ...[meta["og:image"], meta["og:image:url"], meta["twitter:image"], meta["twitter:image:src"]].map((v) => abs(v, base)).filter(Boolean).map((url) => ({ url, why: "Share image" })),
    ...imgs.filter((i) => !i.logo && !/\.svg(\?|$)/i.test(i.url) && !/\.ico(\?|$)/i.test(i.url)).map((i) => ({ url: i.url, why: "Site photo" })),
  ]).slice(0, 16);

  return {
    url: base,
    title: (meta["og:site_name"] || title || "").trim().slice(0, 80),
    logos,
    photos,
    colors,
  };
}

// --- instagram (best effort; Instagram often blocks this) ----------------
export async function scrapeInstagram(handle) {
  const h = String(handle || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").split(/[/?#]/)[0];
  if (!/^[A-Za-z0-9._]{1,30}$/.test(h)) return null;
  try {
    const { text } = await getText(`https://www.instagram.com/${h}/`, 600_000);
    const m = text.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) || text.match(/"profile_pic_url_hd"\s*:\s*"([^"]+)"/);
    if (!m) return null;
    const url = m[1].replace(/&amp;/g, "&").replace(/\\u0026/g, "&").replace(/\\\//g, "/");
    return /^https:\/\//.test(url) ? { url, why: "Instagram profile photo" } : null;
  } catch {
    return null;
  }
}

// Image proxy so the builder can read pixels from other sites (CORS).
export async function proxyImage(raw) {
  const u = normalizeUrl(raw);
  if (!u) return new Response("Bad image address", { status: 400 });
  const res = await fetch(u.toString(), { headers: { "User-Agent": UA, Accept: "image/*,*/*;q=0.5", Referer: u.origin + "/" }, redirect: "follow", cf: { cacheTtl: 3600 } });
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !/^image\//.test(type)) return new Response("Not an image", { status: 415 });
  const len = Number(res.headers.get("content-length") || 0);
  if (len > 10_000_000) return new Response("Image too large", { status: 413 });
  return new Response(res.body, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" } });
}
