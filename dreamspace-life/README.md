# Dreamspace Life

A mobile-friendly fictional AI companion and life-partner creator hosted as a Cloudflare Worker with static assets.

## Features
- Fictional adult character creator, personality options, chat, and memory notes
- Companion chat API and AI portrait generation through Cloudflare Workers AI
- Browser speech input/output where supported
- Local adult-video link library for lawful videos you have permission to access
- Optional AI cinematic video generation integration through the Nureta Developer API
- Video generation runs asynchronously; the UI polls task status and lets users save the result link locally
- Mobile-friendly interface and browser-local storage

## Deploy automatically from GitHub
The workflow at `.github/workflows/deploy-dreamspace-life.yml` deploys this project whenever files under `dreamspace-life/` change on `main`.

1. In Cloudflare, create an API token with permission to deploy Workers and access the target account.
2. In GitHub, open **Settings → Secrets and variables → Actions** for this repository.
3. Add repository secrets:
   - `CLOUDFLARE_API_TOKEN` — the token from Cloudflare
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID
4. Open **Actions → Deploy Dreamspace Life → Run workflow**, or push a change to `dreamspace-life/`.
5. Open the deployment log to find the deployed `workers.dev` URL.

## Enable AI video generation
AI video generation is optional and is disabled until the server-side provider secret is configured.

1. Create an account and API key at [Nureta Developer API](https://developer.nureta.ai/keys).
2. Add prepaid balance to the provider account before generating videos. Pricing is per second and varies by model; check [current API docs and pricing](https://developer.nureta.ai/docs/video) before generating.
3. Open the Cloudflare dashboard → **Workers & Pages** → your deployed Dreamspace Life Worker → **Settings** → **Variables and Secrets**.
4. Add a secret named `NURETA_API_KEY` with your private API key. Never put this key in browser JavaScript or commit it to GitHub.
5. Redeploy or restart the Worker if the dashboard asks you to.
6. Test `/api/health` and then open the site. Confirm the 18+ checkbox to unlock the local video library and video studio.

The Worker exposes:
- `POST /api/video-generate` — submits a short video generation task.
- `GET /api/video-status?id=cgt-...` — checks task status.

The UI currently supports 5, 8, 10, 12, or 15-second clips at 480p, 720p, or 1080p. Generated links from the provider may expire after seven days, so download or securely archive any video you are allowed to keep. The library itself stores links in the current browser only.

The video studio is configured for non-explicit romantic scenes featuring clearly adult fictional characters. It rejects prompts containing several obvious abuse/non-consent indicators, but text filters are not a substitute for provider moderation or lawful, consensual use. The 18+ checkbox is a reminder, not formal age verification.

## Deploy locally
1. Install Node.js.
2. Run `cd dreamspace-life && npm install`.
3. Run `npx wrangler login`.
4. Run `npm run dev` for local preview or `npm run deploy` to deploy.

## AI requirements
Workers AI must be enabled for the Cloudflare account. The chat and image model identifiers in `src/worker.js` may need adjustment based on current model availability and account access. Test `/api/health` after deployment. If generation fails, inspect Worker logs and verify model availability, quota, the Nureta API key, and the provider balance.

## Privacy and content
Profiles, chat messages, memory notes, and saved video URLs are stored in the user's current browser. API keys are server-side secrets. The age prompt is not formal age verification. Use only legal content involving consenting adults and only URLs you have permission to access or share. Do not commit credentials or private API keys to this repository.
