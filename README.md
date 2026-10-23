# zimage2 — Online AI Image Studio

zimage2 is a browser-based and Android text-to-image app. The online site is deployed with GitHub Pages; generation is performed by a separately deployed API.

## Models

- **FLUX.1-dev** — higher-quality hosted model through Hugging Face Inference Providers. Requires an HF token and may incur charges after any included credits.
- **FLUX.1 Schnell** — faster model through Cloudflare Workers AI.
- **Stable Diffusion XL** — alternate Cloudflare Workers AI model.

No large model weights are packaged into the website or APK. The models run on remote GPU inference services, so internet and available provider quota/billing are required. Hugging Face's current pricing and credits: https://huggingface.co/docs/inference-providers/pricing

## Deploy the online website

The repository contains `web/index.html`. The workflow `.github/workflows/pages.yml` deploys it to GitHub Pages. In GitHub, open **Settings → Pages** and set the build/deployment source to **GitHub Actions** if it is not already selected. Then open **Actions** and check **Deploy zimage2 online web app**. The resulting Pages URL appears in the workflow deployment environment.

## Deploy the image API

1. Create/enable a Cloudflare account with Workers AI.
2. Install Node.js, open a terminal in `server/`, then run `npm install`, `npx wrangler login`, and `npm run deploy`.
3. For the heavy FLUX.1-dev model, create a Hugging Face fine-grained token with **Make calls to Inference Providers** permission: https://huggingface.co/settings/tokens
4. In the `server/` directory, set the token as a Cloudflare Worker secret (do not place it in frontend code):
   ```sh
   npx wrangler secret put HF_TOKEN
   ```
   Paste the token when prompted. Then deploy again with `npm run deploy`.
5. Verify `https://YOUR-WORKER.workers.dev/health` returns JSON with `"ok": true`.
6. In zimage2's **Image engine** section, use that Worker URL and select **FLUX.1-dev**.

**Security:** Never commit or expose the Hugging Face token in the website, APK, GitHub source, or chat. Store it only as the Worker secret. The current API uses permissive CORS and has no user authentication/rate limit; add abuse controls before public production use.

## Build the Android APK

Open **Actions**, run **Build zimage2 APK**, and download the `zimage2-debug-apk` artifact after the run succeeds. A source commit is not proof that a build or live generation test succeeded.

## API

- `GET /health` — health and available model names.
- `POST /generate` — JSON body such as `{"prompt":"a fox in a moonlit forest","size":768,"style":"digital painting","model":"fluxdev"}`; returns PNG image bytes when successful.
