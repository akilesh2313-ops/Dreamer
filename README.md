# zimage2 — AI Image Generator

zimage2 is an Android text-to-image app using a real remote inference backend: Cloudflare Workers AI with Stable Diffusion XL Base 1.0.

## Current architecture

- Android app: responsive WebView UI; sends prompt/style/size to your deployed API and saves returned images.
- Backend: `server/` Cloudflare Worker calls the hosted model `@cf/stabilityai/stable-diffusion-xl-base-1.0`.
- The APK does **not** contain model weights. Generation needs an internet connection and a deployed Worker.

## Model and license

The SDXL Base 1.0 model card lists the **CreativeML Open RAIL++-M** license, not Apache 2.0. Review the full license and acceptable-use terms before using or distributing the app: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0

Official Cloudflare model/API documentation: https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-base-1.0/

## Deploy the backend (free tier if eligible)

1. Create a Cloudflare account and enable Workers AI.
2. On a computer with Node.js installed, open the `server` directory.
3. Run `npm install`, then `npx wrangler login`, then `npm run deploy`.
4. Copy the deployed `https://…workers.dev` URL.
5. Install zimage2 and paste that URL in **Image engine → zimage2 API base URL**. Tap **Save & test connection**, then generate.

Cloudflare currently lists a free allocation of 10,000 Neurons per day for Workers AI; limits and pricing may change. Check https://developers.cloudflare.com/workers-ai/platform/pricing/. Requests can fail after quota is exhausted.

## Build the Android APK

1. Open the repository's **Actions** tab.
2. Select **Build zimage2 APK** and run the workflow, or push a commit to `main`.
3. After the workflow succeeds, download the `zimage2-debug-apk` artifact.

A successful source commit does not mean the APK build passed. Check Actions for the actual result. The app can compile without a deployed backend, but image generation cannot work until the Worker is deployed.

## API endpoints

- `GET /health` — status and model identifier.
- `POST /generate` with JSON `{"prompt":"a fox in a moonlit forest","size":512,"style":"digital painting"}` — returns PNG image bytes.

This starter Worker has open CORS and no authentication/rate limiting. Before sharing a public deployment widely, add abuse controls and monitor usage.
