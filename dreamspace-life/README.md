# Dreamspace Life

A mobile-friendly fictional AI companion and life-partner creator hosted as a Cloudflare Worker with static assets.

## Features
- Life-partner creator with name, appearance style, personality, and preferences
- Character profile, chat history, and memory notes saved in browser local storage
- Companion chat API using Cloudflare Workers AI
- AI portrait generation API using Cloudflare Workers AI
- Browser speech input/output where supported
- Optional 18+ video URL library: users must confirm adulthood and add their own direct video URLs; the project does not host or supply videos

## Deploy automatically from GitHub
The workflow at `.github/workflows/deploy-dreamspace-life.yml` deploys this project whenever files under `dreamspace-life/` change on `main`.

1. In Cloudflare, create an API token with permission to deploy Workers and access the target account.
2. In GitHub, open **Settings → Secrets and variables → Actions** for this repository.
3. Add repository secrets:
   - `CLOUDFLARE_API_TOKEN` — the token from Cloudflare
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID
4. Open **Actions → Deploy Dreamspace Life → Run workflow**, or push a change to `dreamspace-life/`.
5. Open the deployment log to find the deployed `workers.dev` URL.

## Deploy locally
1. Install Node.js.
2. Run `cd dreamspace-life && npm install`.
3. Run `npx wrangler login`.
4. Run `npm run dev` for local preview or `npm run deploy` to deploy.

## AI requirements
Workers AI must be enabled for the Cloudflare account. The chat and image model identifiers in `src/worker.js` may need adjustment based on current model availability and account access. Test `/api/health` after deployment. If generation fails, inspect the Worker logs and verify model availability and quota.

## Privacy and content
Profiles, chat messages, memory notes, and saved video URLs are stored in the user's current browser. The age prompt is not formal age verification. Use only legal content involving consenting adults, and only URLs you have permission to access or share. Do not commit credentials or private API keys to this repository.
