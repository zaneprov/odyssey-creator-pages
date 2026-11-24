# Odyssey Creator Pages

A builder for creator partner pages. Fill in a creator at `/admin`, click Generate, and two pages go live:

- `/c/<creator>`: the player page (hook, proof, commitments wall, offer, apply button with the creator's referral code)
- `/c/<creator>/pitch`: the creator pitch (commission at 10, 25 and 50 sales)

The bare domain `/` shows the generic Odyssey page (referral code `DIRECT`).

Runs on Cloudflare Pages with Pages Functions. Creator records and photos are stored in Cloudflare KV, so nothing about creators lives in this repo.

## One-time Cloudflare setup

1. **Create the Pages project.** Workers & Pages → Create → Pages → Connect to Git → pick `odyssey-creator-pages`. Framework preset: None. Build command: leave empty. Build output directory: `public`. Deploy.
2. **Create the KV store.** Workers & Pages → KV (under Storage & Databases) → Create namespace, name it `odyssey-creators`.
3. **Bind it.** Pages project → Settings → Bindings → Add → KV namespace. Variable name `CREATORS`, namespace `odyssey-creators`.
4. **Set the builder password.** Pages project → Settings → Variables and secrets → Add. Type Secret, name `ADMIN_PASSWORD`, value of your choice. Username is `odyssey` (override with `ADMIN_USER`).
5. **Lead form.** Add plain-text variables:
   - `FORM_URL`: the Google Form link (`https://docs.google.com/forms/d/e/.../viewform`)
   - `FORM_REF_ENTRY`: the prefill id of the "Referral code" question, e.g. `entry.123456789` (from the form's ⋮ → Get pre-filled link)
   - `VIDEO_URL` (optional): a YouTube or Loom link for the testimonial video
6. **Redeploy** (Deployments → latest → Retry deployment) so the bindings and variables take effect.
7. **Custom domain.** Pages project → Custom domains → Set up a domain.

## Editing shared content

Odyssey facts (proof numbers, benefits, steps, staff, FAQ) are in `functions/_lib/config.js`. The commitments wall reads `functions/_lib/commits.json` and the images in `public/assets/commits/`. Push to `main` and Cloudflare redeploys in about a minute.

## Local testing

```
npm install
echo "ADMIN_PASSWORD=test" > .dev.vars
npm run dev    # http://localhost:8788, builder at /admin (user odyssey)
```
