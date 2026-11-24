// Shared Odyssey facts shown on every creator page.
// Edit here and push: Cloudflare redeploys automatically.
// Lead form, prefill id and video can also be set as Cloudflare environment
// variables (FORM_URL, FORM_REF_ENTRY, VIDEO_URL) without touching code.

export const ODYSSEY = {
  brand: "Odyssey College Recruiting",
  contactEmail: "theodysseyoperations@gmail.com",
  proof: [
    { big: "155", label: "players placed in college soccer" },
    { big: "100%", label: "of clients received a college offer" },
    { big: "D1", label: "run by current pro players, all former NCAA Division I" },
  ],
  benefits: [
    "Full college recruiting help, from first call to signed offer",
    "Access to our network of college coaches",
    "A target list of programs that fit your level and goals",
    "Help negotiating and leveraging your offers",
    "Guidance through visits, applications and eligibility",
    "And much more, with players who have been through it",
  ],
  steps: [
    { title: "Apply in two minutes", text: "Tell us your level, grad year and goals. The right Odyssey coach gets back to you with an honest read on where you fit." },
    { title: "We build your plan", text: "Target list of programs, highlight video, outreach and a timeline that fits your grad year." },
    { title: "We work the coaches", text: "We use our relationships with college coaches to get you seen, then guide you through visits and offers." },
  ],
  staff: [
    { name: "Angelo Calfo", role: "Founder", bio: "Seattle native. Played 3 years D1 at Gonzaga, now playing professionally." },
    { name: "Charlie Gaffney", role: "Director of Men's Soccer", bio: "Former D1 player, now playing professionally." },
  ],
  faq: [
    { q: "Who is this for?", a: "High school and JUCO players who want to play college soccer in the US, at any division." },
    { q: "How much does it cost?", a: "Applying is free. If we can help, we explain the options and pricing on your call." },
    { q: "Do you guarantee a scholarship?", a: "No one honest can. We guarantee the work, and we tell you on the first call if we think we can help." },
    { q: "I'm an international player. Can you help?", a: "Yes. We work with players from Europe and elsewhere who want a US college route." },
  ],
  // Defaults; Cloudflare env vars override these.
  formUrl: "",
  formRefEntry: "",
  videoUrl: "",
  defaults: { commissionPct: 15, avgSale: 3000, accent: "#4076e4" },
};

export function settings(env = {}) {
  return {
    formUrl: env.FORM_URL || ODYSSEY.formUrl,
    formRefEntry: env.FORM_REF_ENTRY || ODYSSEY.formRefEntry,
    videoUrl: env.VIDEO_URL || ODYSSEY.videoUrl,
  };
}
