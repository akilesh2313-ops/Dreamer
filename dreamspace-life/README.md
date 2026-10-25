# Dreamspace Life

A separate, mobile-friendly AI companion website inside this repository. The existing Android app and root website files are left untouched.

## Included
- Life-partner creator with name, appearance style, personality, and feature preferences
- Character profile and conversation memory saved in browser local storage
- Companion chat UI with a Cloudflare Worker API
- Image studio with prompt generation and image history
- Browser speech input/output where supported

## Deploy to Cloudflare Workers
1. Open the `dreamspace-life` directory.
2. Install Node.js, then run `npm install`.
3. Sign in using `npx wrangler login`.
4. Ensure Workers AI is enabled for your Cloudflare account.
5. Run `npm run deploy`.
6. Open the deployed `*.workers.dev` URL and test chat and image generation.

The AI routes use the Workers AI binding configured in `wrangler.toml`. Model access and image response formats can vary by account; test the health endpoint first. Do not put private API keys in frontend code.

## Local preview
Run `npm run dev` from this directory.

## Data and boundaries
Profiles, chat messages, and memory notes are stored in the current browser only. The website is a companion UI, not a human relationship. Provider policies and model limitations still apply.
