export interface Env { AI: Ai }

const MODELS = {
  sdxl: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  flux: "@cf/black-forest-labs/flux-1-schnell"
} as const;
type ModelKey = keyof typeof MODELS;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname === "/" || url.pathname === "/health") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      return json({
        ok: true,
        app: "zimage2",
        model: MODELS.sdxl,
        models: [
          { id: "sdxl", name: "Stable Diffusion XL", model: MODELS.sdxl },
          { id: "flux", name: "FLUX.1 Schnell", model: MODELS.flux }
        ],
        task: "text-to-image",
        hosting: "Cloudflare Workers AI (open-weight models; internet required)"
      });
    }
    if (url.pathname !== "/generate") return json({ error: "Not found. Use GET /health or POST /generate." }, 404);
    if (request.method !== "POST") return json({ error: "Use POST /generate." }, 405);

    let body: { prompt?: unknown; size?: unknown; style?: unknown; model?: unknown };
    try { body = await request.json() as typeof body; }
    catch { return json({ error: "Request body must be valid JSON." }, 400); }

    if (typeof body.prompt !== "string" || !body.prompt.trim()) return json({ error: "A non-empty prompt is required." }, 400);
    if (body.prompt.length > 1500) return json({ error: "Prompt must be 1,500 characters or fewer." }, 400);

    const requestedModel = typeof body.model === "string" ? body.model : "sdxl";
    if (!(requestedModel in MODELS)) return json({ error: "Unknown model. Choose sdxl or flux." }, 400);
    const modelKey = requestedModel as ModelKey;
    const model = MODELS[modelKey];
    const requestedSize = Number(body.size ?? 512);
    const size = [512, 768, 1024].includes(requestedSize) ? requestedSize : 512;
    const style = typeof body.style === "string" ? body.style.trim().slice(0, 80) : "";
    const prompt = style ? body.prompt.trim() + ", " + style + " style" : body.prompt.trim();

    try {
      const input = modelKey === "flux"
        ? { prompt, width: size, height: size, num_steps: 4 }
        : { prompt, negative_prompt: "low quality, blurry, distorted, watermark, text", width: size, height: size, num_steps: 20, guidance: 7.5 };
      const result = await env.AI.run(model, input);
      const image = result instanceof Response ? result.body : result;
      if (!image) return json({ error: "The model returned an empty image.", model }, 502);
      return new Response(image as BodyInit, {
        status: 200,
        headers: { ...cors, "Content-Type": "image/png", "Cache-Control": "no-store", "X-Zimage2-Model": model }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown inference error";
      const quota = /quota|limit|billing|exhaust/i.test(message);
      return json({
        error: quota ? "Workers AI quota or billing limit reached." : "Image model request failed.",
        detail: message.slice(0, 500),
        model,
        hint: quota ? "Check your Cloudflare Workers AI usage and billing." : "Confirm the Worker is deployed and its AI binding is enabled."
      }, 502);
    }
  }
} satisfies ExportedHandler<Env>;
