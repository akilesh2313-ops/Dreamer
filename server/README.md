# Dreamer image API (Cloudflare Workers AI)

This folder contains the server-side inference API used by the Dreamer Android app.

## Model and license

- Model: `@cf/stabilityai/stable-diffusion-xl-base-1.0` (SDXL base 1.0)
- Model license: CreativeML Open RAIL++-M; review the full license and acceptable-use restrictions before deployment: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0
- Cloudflare model/API page: https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-base-1.0/
- This is a hosted model, not model weights bundled in the APK.

## Deploy on the free tier

1. Create a Cloudflare account and enable Workers AI in the dashboard.
2. Install Node.js (current LTS) on a computer, then open this directory in a terminal.
3. Run `npm install` and authenticate using `npx wrangler login`.
4. Deploy with `npm run deploy`.
5. Copy the Worker URL (for example, `https://dreamer-image-api.<your-subdomain>.workers.dev`) into Dreamer > Image engine API URL.
6. Test `GET <worker-url>/health`; it should return JSON with `"ok":true`. Then generate an image in the app.

Cloudflare Workers AI currently advertises a free allocation of 10,000 Neurons per day. Quotas, model availability, and terms can change; when the free allocation is exceeded, requests can fail or require a paid plan. Check the current pricing page: https://developers.cloudflare.com/workers-ai/platform/pricing/

## API

- `GET /health` — model and service status.
- `POST /generate` — JSON body: `{"prompt":"a fox in a moonlit forest","size":512,"style":"digital painting"}`; returns PNG bytes.
- CORS is enabled for the Android WebView app. This starter endpoint is public; do not treat it as production abuse-protected infrastructure. Add rate limiting/authentication before publicly sharing a high-traffic deployment.

## Local checks

`npm install`, `npm run typecheck`, then `npm run dev`. Actual inference requires a Cloudflare account with Workers AI enabled.
