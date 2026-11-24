# Odyssey Creator Pages

A builder for creator partner pages. Fill in a creator at `/admin`, click Generate, and two pages go live:

- `/c/<creator>`: the player page (hook, proof, commitments wall, offer, apply button with the creator's referral code)
- `/c/<creator>/pitch`: the creator pitch (commission at 10, 25 and 50 sales)

The bare domain `/` shows the generic Odyssey page (referral code `DIRECT`).

Runs as one Cloudflare Worker with static assets. Creator records and photos are stored in Cloudflare KV, so nothing about creators lives in this repo. Cloudflare creates the KV store automatically on the first deploy.

## One-time Cloudflare setup

1. **Connect the repo.** Workers & Pages → Create → Import a repository → pick `odyssey-creator-pages`. Keep the defaults (deploy command `npx wrangler deploy`). Every push to `main` redeploys.
2. **Set the builder password.** Worker → Settings → Variables and Secrets → Add. Type **Secret**, name `ADMIN_PASSWORD`, value of your choice. Username is `odyssey` (override with an `ADMIN_USER` variable).
3. **Lead form.** Same place, type Text:
   - `FORM_URL`: the Google Form link (`https://docs.google.com/forms/d/e/.../viewform`)
   - `FORM_REF_ENTRY`: the prefill id of the "Referral code" question, e.g. `entry.123456789` (form ⋮ → Get pre-filled link)
   - `VIDEO_URL` (optional): a YouTube or Loom link for the testimonial video
4. **Custom domain.** Worker → Settings → Domains & Routes → Add → Custom domain.

Dashboard variables are kept across deploys (`keep_vars = true` in `wrangler.toml`).

## Editing shared content

Odyssey facts (proof numbers, benefits, steps, staff, FAQ) are in `src/lib/config.js`. The commitments wall reads `src/lib/commits.json` and the images in `public/assets/commits/`. Push to `main` and Cloudflare redeploys in about a minute.

## Local testing

```
npm install
echo "ADMIN_PASSWORD=test" > .dev.vars
npm run dev    # http://localhost:8787, builder at /admin (user odyssey)
```
