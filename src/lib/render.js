import { ODYSSEY, settings } from "./config.js";
import COMMITS from "./commits.json";

export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const initials = (name) => String(name || "O").split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();

export function formLink(env, ref) {
  const s = settings(env);
  if (!s.formUrl) return "#apply";
  if (!s.formRefEntry) return s.formUrl;
  const u = new URL(s.formUrl);
  u.searchParams.set("usp", "pp_url");
  // "entry.123:other" = a multiple-choice question; put the code in its "Other" box.
  const [entry, mode] = s.formRefEntry.trim().split(":");
  if (mode === "other") {
    u.searchParams.set(entry, "__other_option__");
    u.searchParams.set(`${entry}.other_option_response`, ref);
  } else {
    u.searchParams.set(entry, ref);
  }
  return u.toString();
}

function videoEmbed(url) {
  if (!url) return "";
  let m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  m = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  if (m) return `https://www.loom.com/embed/${m[1]}`;
  return "";
}

// --- brand theme -----------------------------------------------------------
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (r, g, b) => "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
const lum = (h) => { const [r, g, b] = hexRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Mix a colour toward black (t<0) or white (t>0).
const shade = (h, t) => { const [r, g, b] = hexRgb(h); const to = t < 0 ? 0 : 255, k = Math.abs(t); return rgbHex(r + (to - r) * k, g + (to - g) * k, b + (to - b) * k); };
// Darken/lighten until the colour reads against a background.
function readable(h, bg, min = 4.5) {
  const dir = lum(bg) > 0.4 ? -1 : 1;
  let c = h;
  for (let i = 0; i < 20 && contrast(c, bg) < min; i++) c = shade(c, dir * 0.08);
  return c;
}

export function theme(c) {
  const base = { navy: "#0b1626", navy2: "#13233a", blue: (c && c.accent) || ODYSSEY.defaults.accent, cta: "#dbff00", ctaText: "#0b1626", htext: "#ffffff", eyebrow: "#8fb0f5", lede: "#dbe3ee", soft: "#c6d0de" };
  if (!c || !c.brandColor) return base;
  const b = c.brandColor;
  const dark = c.brandDark || shade(b, -0.82);
  const htext = contrast("#ffffff", dark) >= 4.5 ? "#ffffff" : "#0b1626";
  const lightHeader = htext !== "#ffffff";
  return {
    navy: dark,
    navy2: lightHeader ? shade(dark, -0.06) : shade(dark, 0.07),
    blue: readable(b, "#ffffff", 3),
    cta: contrast(b, dark) >= 2 ? b : lightHeader ? shade(b, -0.5) : shade(b, 0.5),
    ctaText: "",
    htext,
    eyebrow: readable(b, dark, 3),
    lede: lightHeader ? "#273244" : "#e3e8ef",
    soft: lightHeader ? "#3a4656" : "#c6d0de",
  };
}

// Testimonial Shorts: show a thumbnail and only load the YouTube player on tap (keeps pages fast).
function ytId(v) {
  const m = String(v || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
  return m ? m[1] : /^[\w-]{11}$/.test(v) ? v : null;
}
function testimonials(extraUrl) {
  const list = ODYSSEY.testimonials.map((t) => ({ id: ytId(t.id), caption: t.caption || "" })).filter((t) => t.id);
  const extra = ytId(extraUrl);
  if (extra && !list.some((t) => t.id === extra)) list.unshift({ id: extra, caption: "" });
  if (!list.length) return "";
  const tiles = list
    .map((t) => `<figure class="yt"><button type="button" class="ytb" data-id="${esc(t.id)}" aria-label="Play testimonial video${t.caption ? ": " + esc(t.caption) : ""}"><img loading="lazy" src="https://i.ytimg.com/vi/${esc(t.id)}/hqdefault.jpg" alt=""><span class="play"></span></button>${t.caption ? `<figcaption>${esc(t.caption)}</figcaption>` : ""}</figure>`)
    .join("");
  return `<section class="tight" id="stories"><div class="wrap"><h2><small>In their words</small>Hear from Odyssey players</h2><div class="yts">${tiles}</div></div></section>
<script>document.querySelectorAll(".ytb").forEach(b=>b.addEventListener("click",()=>{const f=document.createElement("iframe");f.src="https://www.youtube-nocookie.com/embed/"+b.dataset.id+"?autoplay=1&playsinline=1&rel=0";f.allow="autoplay; encrypted-media; picture-in-picture; fullscreen";f.allowFullscreen=true;f.title="Odyssey player testimonial";b.replaceWith(f)}))</script>`;
}

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700&display=swap" rel="stylesheet">';

const CSS = (t) => `
:root{--navy:${t.navy};--navy2:${t.navy2};--paper:#f6f7f9;--line:#d9dee6;--ink:#0b1626;--muted:#5b6778;--soft:${t.soft};--blue:${t.blue};--lime:${t.cta};--ctatext:${t.ctaText};--htext:${t.htext};--eyebrow:${t.eyebrow};--lede:${t.lede};--display:'Barlow Condensed','Arial Narrow',sans-serif;--body:'Barlow',Arial,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--body);color:var(--ink);background:var(--paper);line-height:1.5}
a{color:inherit}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
header{background:var(--navy);color:var(--htext)}
.bar{display:flex;align-items:center;justify-content:space-between;padding-top:18px;padding-bottom:18px;gap:12px}
.lock{display:flex;align-items:center;gap:10px;font-family:var(--display);font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:17px;line-height:1}
.lock img{height:36px}.lock .x{color:var(--eyebrow);font-size:20px}
.chip{background:#fff;border-radius:8px;padding:5px 9px;display:inline-flex;align-items:center}.chip img{height:34px;max-width:150px;object-fit:contain}
.hero{position:relative;overflow:hidden;padding:36px 0 56px}
.hero .wm{position:absolute;right:-120px;bottom:-80px;width:520px;opacity:.10;pointer-events:none}
.hero-grid{display:grid;grid-template-columns:1fr auto;gap:36px;align-items:center;position:relative}
.eyebrow{font-family:var(--display);font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--eyebrow);font-size:14px}
h1{font-family:var(--display);font-weight:700;text-transform:uppercase;line-height:.92;font-size:clamp(40px,7vw,68px);margin-top:10px}
.lede{color:var(--lede);font-size:17px;max-width:560px;margin-top:14px}
.avatar{width:200px;height:200px;border-radius:50%;border:4px solid var(--lime);object-fit:cover;background:var(--navy2);display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:72px;font-weight:700;color:var(--htext)}
.avatar.logo{background:#fff;object-fit:contain;padding:26px}
.shotwrap{position:relative}
.shot{width:320px;height:360px;border-radius:14px;object-fit:cover;display:block;border:4px solid var(--lime);box-shadow:0 18px 50px rgba(0,0,0,.35)}
.badge{position:absolute;left:-26px;bottom:-22px;width:96px;height:96px;border-radius:50%;background:#fff;border:3px solid var(--lime);object-fit:contain;padding:12px;box-shadow:0 8px 20px rgba(0,0,0,.25)}
.cta{display:inline-block;margin-top:24px;background:var(--lime);color:var(--ctatext);font-family:var(--display);font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:20px;padding:14px 26px;border-radius:4px;text-decoration:none}
.cta.alt{background:transparent;color:var(--htext);border:2px solid currentColor;opacity:.85;margin-left:10px}
.proof{background:var(--navy2);color:var(--htext)}
.proof .wrap{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding-top:26px;padding-bottom:26px}
.proof b{display:block;font-family:var(--display);font-size:46px;line-height:.9;color:var(--lime)}
.proof span{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--soft)}
section{padding:56px 0}
section.tight{padding-top:0}
h2{font-family:var(--display);font-weight:700;text-transform:uppercase;font-size:34px;line-height:1}
h2 small{display:block;font-size:14px;letter-spacing:.2em;color:var(--blue);font-weight:600;margin-bottom:6px}
h3{font-family:var(--display);font-weight:700;text-transform:uppercase;font-size:22px;line-height:1.05}
.card{background:#fff;border:1px solid var(--line);border-radius:6px;padding:22px}
.card p{color:#273244;font-size:15px;margin-top:8px}
.card .n{font-family:var(--display);font-weight:700;font-size:36px;color:var(--blue);line-height:1}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:26px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:26px}
.role{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600}
.gets{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:4px 28px;margin-top:18px}
.gets li{padding:9px 0 9px 26px;position:relative;border-bottom:1px solid var(--line);font-size:16px}
.gets li:before{content:"";position:absolute;left:0;top:16px;width:12px;height:12px;background:var(--lime);border:2px solid var(--navy);border-radius:2px}
.wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-top:22px}
.wall figure{background:#fff;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.wall img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block}
.wall figcaption{padding:8px 10px;font-size:12px;color:var(--muted);line-height:1.3}
.wall figcaption b{display:block;color:var(--ink);font-size:14px}
.more{margin-top:16px;background:none;border:1px solid var(--line);border-radius:4px;padding:10px 16px;font:inherit;cursor:pointer}
.yts{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:22px;max-width:820px}
.yt{margin:0}.yt figcaption{font-size:13px;color:var(--muted);margin-top:6px}
.ytb,.yt iframe{display:block;width:100%;aspect-ratio:9/16;border:0;border-radius:10px;overflow:hidden;background:#000;position:relative;padding:0;cursor:pointer}
.ytb img{width:100%;height:100%;object-fit:cover;display:block}
.ytb .play{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:var(--lime);box-shadow:0 6px 20px rgba(0,0,0,.4)}
.ytb .play:after{content:"";position:absolute;left:26px;top:20px;border-style:solid;border-width:12px 0 12px 19px;border-color:transparent transparent transparent var(--ctatext)}
.video{position:relative;padding-top:56.25%;margin-top:22px;border-radius:8px;overflow:hidden;background:#000}
.video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.faq{margin-top:22px;border-top:1px solid var(--line)}
.faq details{border-bottom:1px solid var(--line);padding:16px 0}
.faq summary{cursor:pointer;font-weight:600;font-size:17px}
.faq p{margin-top:8px;color:#273244}
.formbox{background:var(--navy);color:var(--htext);border-radius:8px;padding:30px}
.formbox h2{color:var(--htext)}.formbox h2 small{color:var(--eyebrow)}
.small{font-size:13px;color:var(--soft);margin-top:12px}
.calc b{display:block;font-family:var(--display);font-size:44px;line-height:1;color:var(--blue)}
.list{list-style:none;margin-top:10px}
.list li{padding:7px 0 7px 22px;position:relative;border-bottom:1px solid var(--line);font-size:15px}
.list li:before{content:"";position:absolute;left:0;top:15px;width:10px;height:10px;background:var(--blue);border-radius:2px}
footer{padding:28px 0;color:var(--muted);font-size:13px;border-top:1px solid var(--line)}
footer .wrap{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
@media(max-width:760px){
 .hero-grid{grid-template-columns:1fr}.avatar{width:120px;height:120px;font-size:44px;order:-1}.avatar.logo{padding:16px}
 .shotwrap{order:-1;margin-left:20px}.shot{width:100%;max-width:340px;height:240px}.badge{width:72px;height:72px;left:-14px;bottom:-14px;padding:9px}
 .proof .wrap,.grid3,.grid2,.gets{grid-template-columns:1fr}
 .wall,.yts{grid-template-columns:repeat(2,1fr)}
 .cta.alt{margin-left:0;margin-top:10px}.hero .wm{width:340px}
}`;

function page({ title, desc, c, body, noindex }) {
  const t = theme(c);
  if (!t.ctaText) t.ctaText = contrast("#ffffff", t.cta) >= contrast("#0b1626", t.cta) ? "#ffffff" : "#0b1626";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${c && c.hasPhoto ? `/photo/${esc(c.slug)}` : "/assets/odyssey_sailboat_blue_transparent.png"}">
${noindex ? '<meta name="robots" content="noindex">' : ""}
<link rel="icon" href="/assets/odyssey_sailboat_blue_transparent.png">
${FONTS}<style>${CSS(t)}</style></head><body>${body}</body></html>`;
}

function lockup(c) {
  return `<div class="lock"><img src="/assets/odyssey_sailboat_blue_transparent.png" alt="Odyssey"><span>Odyssey</span>${
    c ? `<span class="x">&times;</span>${c.hasLogo ? `<span class="chip"><img src="${img(c, "logo")}" alt="${esc(c.name)} logo"></span>` : `<span>${esc(c.name)}</span>`}` : ""
  }</div>`;
}

const img = (c, kind) => `/${kind}/${esc(c.slug)}?v=${esc(encodeURIComponent(c.updatedAt || ""))}`;

function avatar(c) {
  if (c && c.hasPhoto)
    return `<div class="shotwrap"><img class="shot" src="${img(c, "photo")}" alt="${esc(c.name)}">${c.hasLogo ? `<img class="badge" src="${img(c, "logo")}" alt="">` : ""}</div>`;
  if (c && c.hasLogo) return `<img class="avatar logo" src="${img(c, "logo")}" alt="${esc(c.name)}">`;
  return `<div class="avatar">${esc(initials(c ? c.name : "Odyssey"))}</div>`;
}

const footer = (c) =>
  `<footer><div class="wrap"><span>${esc(ODYSSEY.brand)} · <a href="mailto:${esc(ODYSSEY.contactEmail)}">${esc(ODYSSEY.contactEmail)}</a></span>${
    c ? `<span>Partner: ${esc(c.name)} · code ${esc(c.refCode)}</span>` : ""
  }</div></footer>`;

export function playerPage(c, env) {
  const ref = c ? c.refCode : "DIRECT";
  const apply = esc(formLink(env, ref));
  const vid = videoEmbed(settings(env).videoUrl);
  const shown = 12;
  const wall = COMMITS.map(
    (m, i) =>
      `<figure${i >= shown ? ' hidden data-more' : ""}><img loading="lazy" src="/assets/${esc(m.file)}" alt="${esc(m.name)} committed to ${esc(m.school)}"><figcaption><b>${esc(m.name)}</b>${esc(m.school)} · ${esc(m.level)}</figcaption></figure>`
  ).join("");
  const hook = c?.hook || "Play college soccer. We'll get you there.";
  const intro =
    c?.intro || "Odyssey is run by current pros who played D1. We handle the recruiting so you can focus on playing.";
  const body = `
<header><div class="wrap bar">${lockup(c)}</div>
<div class="hero"><img class="wm" src="/assets/odyssey_sailboat_white_transparent.png" alt="">
<div class="wrap hero-grid"><div>
<div class="eyebrow">${c ? `Recommended by ${esc(c.name)}${c.handle ? " · " + esc(c.handle) : ""}` : "Odyssey College Recruiting"}</div>
<h1>${esc(hook)}</h1>
<p class="lede">${esc(intro)}</p>
<a class="cta" href="${apply}">Apply for a free evaluation</a><a class="cta alt" href="#get">What you get</a>
</div>${avatar(c)}</div></div></header>
<div class="proof"><div class="wrap">${ODYSSEY.proof.map((p) => `<div><b>${esc(p.big)}</b><span>${esc(p.label)}</span></div>`).join("")}</div></div>
<section id="get"><div class="wrap"><div class="card"><h2><small>What you get</small>Full college recruiting help, start to finish</h2><ul class="gets">${ODYSSEY.benefits.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div></div></section>
<section class="tight"><div class="wrap"><h2><small>Proof</small>Recent Odyssey commitments</h2><div class="wall">${wall}</div>
${COMMITS.length > shown ? `<button class="more" onclick="document.querySelectorAll('[data-more]').forEach(e=>e.hidden=false);this.remove()">Show all ${COMMITS.length}</button>` : ""}</div></section>
${testimonials(settings(env).videoUrl) || (vid ? `<section class="tight"><div class="wrap"><h2><small>In their words</small>Hear from an Odyssey player</h2><div class="video"><iframe src="${esc(vid)}" allowfullscreen loading="lazy" title="Odyssey player testimonial"></iframe></div></div></section>` : "")}
<section class="tight"><div class="wrap"><h2><small>How it works</small>From first call to signed offer</h2><div class="grid3">${ODYSSEY.steps
    .map((s, i) => `<div class="card"><div class="n">0${i + 1}</div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`)
    .join("")}</div></div></section>
<section class="tight"><div class="wrap"><h2><small>Your team</small>Players who have done it</h2><div class="grid3">${ODYSSEY.staff
    .map((s) => `<div class="card"><div class="role">${esc(s.role)}</div><h3>${esc(s.name)}</h3><p>${esc(s.bio)}</p></div>`)
    .join("")}</div></div></section>
<section class="tight" id="apply"><div class="wrap"><div class="formbox">
<h2><small>Free evaluation</small>Ready to play in college?</h2>
<p class="lede">Two minutes. Tell us your level, grad year and goals, and the right Odyssey coach gets back to you.</p>
<a class="cta" href="${apply}">Apply now</a>
${c ? `<p class="small">Referral code ${esc(ref)} is filled in for you.</p>` : ""}
</div></div></section>
<section class="tight"><div class="wrap"><h2><small>Questions</small>FAQ</h2><div class="faq">${ODYSSEY.faq
    .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
    .join("")}</div></div></section>
${footer(c)}`;
  return page({
    title: c ? `${c.name} x Odyssey College Recruiting` : "Odyssey College Recruiting",
    desc: c ? `Play college soccer with Odyssey College Recruiting, recommended by ${c.name}.` : "Play college soccer with Odyssey College Recruiting.",
    c,
    body,
  });
}

export function pitchPage(c, env, origin) {
  const pct = Number(c.commissionPct) || ODYSSEY.defaults.commissionPct;
  const avg = Number(c.avgSale) || ODYSSEY.defaults.avgSale;
  const per = (avg * pct) / 100;
  const link = `${origin}/c/${c.slug}`;
  const body = `
<header><div class="wrap bar">${lockup(c)}</div>
<div class="hero"><img class="wm" src="/assets/odyssey_sailboat_white_transparent.png" alt="">
<div class="wrap hero-grid"><div>
<div class="eyebrow">Creator partnership · for ${esc(c.name)}</div>
<h1>You post. We place your players.</h1>
<p class="lede">Your followers ask how to play college soccer. Odyssey runs the whole service behind your name: calls, coaching, coach relationships and offers. You earn ${pct}% of every sale from your link.</p>
<a class="cta" href="/c/${esc(c.slug)}">See your page</a>
</div>${avatar(c)}</div></div></header>
<section><div class="wrap"><h2><small>What you could earn</small>${pct}% of each sale, about ${money(per)} per player</h2>
<div class="grid3 calc">${[10, 25, 50].map((n) => `<div class="card"><span class="role">${n} sales</span><b>${money(n * per)}</b><p>to you</p></div>`).join("")}</div>
<p class="small" style="color:var(--muted)">Illustration based on an average sale of ${money(avg)}. Paid on collected revenue from players who come through code ${esc(c.refCode)}.</p></div></section>
<section class="tight"><div class="wrap"><div class="grid2">
<div class="card"><h3>You do</h3><ul class="list"><li>Post about it when it fits your content</li><li>Share your link and code ${esc(c.refCode)}</li><li>Nothing else</li></ul></div>
<div class="card"><h3>Odyssey does</h3><ul class="list"><li>Every lead call and follow-up</li><li>Player plans, video and coach outreach</li><li>Monthly lead and payout report</li></ul></div>
</div><p class="small" style="color:var(--muted)">Your link: <a href="${esc(link)}">${esc(link)}</a></p></div></section>
<section class="tight"><div class="wrap"><h2><small>Proof</small>${COMMITS.length}+ recent commitments</h2><div class="wall">${COMMITS.slice(0, 6)
    .map((m) => `<figure><img loading="lazy" src="/assets/${esc(m.file)}" alt="${esc(m.name)}"><figcaption><b>${esc(m.name)}</b>${esc(m.school)}</figcaption></figure>`)
    .join("")}</div></div></section>
${footer(null)}`;
  return page({ title: `Partner offer for ${c.name}`, desc: "Odyssey College Recruiting creator partnership", c, body, noindex: true });
}

export function notFound() {
  return page({
    title: "Page not found · Odyssey",
    desc: "",
    body: `<header><div class="wrap bar">${lockup(null)}</div><div class="hero"><div class="wrap"><h1>Page not found</h1><p class="lede">This link may have changed. <a href="/">Go to Odyssey College Recruiting</a>.</p></div></div></header>`,
    noindex: true,
  });
}
