export interface Env { AI: Ai; HF_TOKEN?: string }

const MODELS = {
  fluxdev: "black-forest-labs/FLUX.1-dev",
  flux: "@cf/black-forest-labs/flux-1-schnell",
  sdxl: "@cf/stabilityai/stable-diffusion-xl-base-1.0"
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

function isReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
  return typeof value === "object" && value !== null && "getReader" in value;
}

async function imageResponse(result: unknown, model: string): Promise<Response> {
  if (result instanceof Response) {
    if (!result.ok) throw new Error("Model returned HTTP " + result.status);
    const type = result.headers.get("content-type") || "image/png";
    if (type.includes("json")) return imageResponse(await result.json(), model);
    if (!result.body) throw new Error("Model returned an empty response body");
    return new Response(result.body, { headers: { ...cors, "Content-Type": type, "Cache-Control": "no-store", "X-Zimage2-Model": model } });
  }
  if (result instanceof Uint8Array || result instanceof ArrayBuffer || isReadableStream(result)) {
    return new Response(result, { headers: { ...cors, "Content-Type": "image/png", "Cache-Control": "no-store", "X-Zimage2-Model": model } });
  }
  if (typeof result === "object" && result !== null) {
    const obj = result as Record<string, unknown>;
    const image = obj.image ?? obj.output ?? obj.data;
    if (typeof image === "string") {
      const binary = atob(image.replace(/^data:image\/[^;]+;base64,/i, ""));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Response(bytes, { headers: { ...cors, "Content-Type": "image/png", "Cache-Control": "no-store", "X-Zimage2-Model": model } });
    }
    if (image instanceof Uint8Array || image instanceof ArrayBuffer || isReadableStream(image)) {
      return new Response(image, { headers: { ...cors, "Content-Type": "image/png", "Cache-Control": "no-store", "X-Zimage2-Model": model } });
    }
  }
  throw new Error("Unsupported image response format from model");
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
        model: MODELS.fluxdev,
        models: [
          { id: "fluxdev", name: "FLUX.1-dev (Hugging Face hosted)", model: MODELS.fluxdev, requiresSecret: true },
          { id: "flux", name: "FLUX.1 Schnell", model: MODELS.flux },
          { id: "sdxl", name: "Stable Diffusion XL", model: MODELS.sdxl }
        ],
        task: "text-to-image",
        hosting: "Online hosted inference; HF_TOKEN required for FLUX.1-dev"
      });
    }
    if (url.pathname !== "/generate") return json({ error: "Not found. Use GET /health or POST /generate." }, 404);
    if (request.method !== "POST") return json({ error: "Use POST /generate." }, 405);

    let body: { prompt?: unknown; size?: unknown; style?: unknown; model?: unknown };
    try { body = await request.json() as typeof body; }
    catch { return json({ error: "Request body must be valid JSON." }, 400); }
    if (typeof body.prompt !== "string" || !body.prompt.trim()) return json({ error: "A non-empty prompt is required." }, 400);
    if (body.prompt.length > 1500) return json({ error: "Prompt must be 1,500 characters or fewer." }, 400);

    const requestedModel = typeof body.model === "string" ? body.model : "fluxdev";
    if (!Object.prototype.hasOwnProperty.call(MODELS, requestedModel)) return json({ error: "Unknown model. Choose fluxdev, flux, or sdxl." }, 400);
    const modelKey = requestedModel as ModelKey;
    const model = MODELS[modelKey];
    if (modelKey === "fluxdev" && !env.HF_TOKEN) {
      return json({ error: "FLUX.1-dev is not configured yet.", hint: "Set a Hugging Face token as the Cloudflare Worker secret HF_TOKEN. Never put the token in the app." }, 503);
    }

    const requestedSize = Number(body.size ?? 768);
    const size = [512, 768, 1024].includes(requestedSize) ? requestedSize : 768;
    const style = typeof body.style === "string" ? body.style.trim().slice(0, 80) : "";
    const prompt = style ? body.prompt.trim() + ", " + style + " style" : body.prompt.trim();

    try {
      if (modelKey === "fluxdev") {
        const upstream = await fetch("https://router.huggingface.co/hf-inference/models/" + model, {
          method: "POST",
          headers: { "Authorization": "Bearer " + env.HF_TOKEN!, "Content-Type": "application/json", "Accept": "image/png" },
          body: JSON.stringify({ inputs: prompt, parameters: { width: size, height: size, num_inference_steps: 28, guidance_scale: 3.5 } })
        });
        if (!upstream.ok) {
          const detail = (await upstream.text()).slice(0, 700);
          const hint = upstream.status === 401 || upstream.status === 403
            ? "Check the token's Inference Providers permission and model access."
            : upstream.status === 429 ? "Provider rate limit or billing limit; retry later and check your Hugging Face billing."
            : "Check Hugging Face Inference Providers availability and account billing.";
          return json({ error: "Hosted FLUX.1-dev generation failed.", detail, model, hint }, 502);
        }
        const type = upstream.headers.get("content-type") || "image/png";
        if (!type.startsWith("image/")) return json({ error: "Provider did not return image data.", detail: (await upstream.text()).slice(0, 500), model }, 502);
        return new Response(upstream.body, { headers: { ...cors, "Content-Type": type, "Cache-Control": "no-store", "X-Zimage2-Model": model } });
      }
      const input = modelKey === "flux"
        ? { prompt, width: size, height: size, num_steps: 4 }
        : { prompt, negative_prompt: "low quality, blurry, distorted, watermark, text", width: size, height: size, num_steps: 20, guidance: 7.5 };
      return await imageResponse(await env.AI.run(model, input), model);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown inference error";
      const quota = /quota|limit|billing|exhaust/i.test(message);
      return json({
        error: quota ? "AI quota or billing limit reached." : "Image model request failed.",
        detail: message.slice(0, 500),
        model,
        hint: quota ? "Check the selected provider's usage and billing." : "Confirm the Worker is deployed and its AI binding/token is configured."
      }, 502);
    }
  }
} satisfies ExportedHandler<Env>;
