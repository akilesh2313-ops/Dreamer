export interface Env { AI: Ai }

const MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
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
      return json({ ok: true, app: "Dreamer", model: MODEL, task: "text-to-image" });
    }
    if (url.pathname !== "/generate") return json({ error: "Not found. Use GET /health or POST /generate." }, 404);
    if (request.method !== "POST") return json({ error: "Use POST /generate." }, 405);

    let body: { prompt?: unknown; size?: unknown; style?: unknown };
    try { body = await request.json() as typeof body; }
    catch { return json({ error: "Request body must be valid JSON." }, 400); }

    if (typeof body.prompt !== "string" || !body.prompt.trim()) return json({ error: "A non-empty prompt is required." }, 400);
    if (body.prompt.length > 1500) return json({ error: "Prompt must be 1,500 characters or fewer." }, 400);

    const requestedSize = Number(body.size ?? 512);
    const size = [512, 768, 1024].includes(requestedSize) ? requestedSize : 512;
    const style = typeof body.style === "string" ? body.style.trim().slice(0, 80) : "";
    const prompt = style ? body.prompt.trim() + ", " + style + " style" : body.prompt.trim();

    try {
      const result = await env.AI.run(MODEL, {
        prompt,
        negative_prompt: "low quality, blurry, distorted, watermark, text",
        width: size,
        height: size,
        num_steps: 20,
        guidance: 7.5
      });
      // Workers AI image models return binary image data (often a ReadableStream).
      const image = result instanceof Response ? result.body : result;
      if (!image) return json({ error: "The model returned an empty image." }, 502);
      return new Response(image as BodyInit, {
        status: 200,
        headers: { ...cors, "Content-Type": "image/png", "Cache-Control": "no-store", "X-Dreamer-Model": MODEL }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown inference error";
      return json({ error: "Image generation failed. Check Workers AI availability and daily quota.", detail: message.slice(0, 500) }, 502);
    }
  }
} satisfies ExportedHandler<Env>;
