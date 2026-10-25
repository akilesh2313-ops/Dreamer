const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "Content-Type" } });

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "Dreamspace Life", aiConfigured: Boolean(env.AI) });
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      if (!env.AI) return json({ error: "Workers AI binding is missing. Check wrangler.toml and your Cloudflare account." }, 503);
      let body;
      try { body = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400); }
      const character = body.character && typeof body.character === "object" ? body.character : {};
      const messages = Array.isArray(body.messages) ? body.messages.slice(-24) : [];
      if (!messages.some(m => m && m.role === "user")) return json({ error: "Add a user message first." }, 400);
      const system = [
        "You are a fictional AI companion in Dreamspace Life. Stay consistent with the fictional character and respond naturally.",
        "The companion is fictional and must not claim to be a real person or to have real-world experiences.",
        "Keep romance and roleplay between consenting adults; do not sexualize minors or assist real-world harm.",
        "Character name: " + String(character.name || "Companion").slice(0, 60),
        "Personality: " + String(character.personality || "kind, curious, and engaging").slice(0, 1000),
        "Relationship style: " + String(character.personalityType || "warm and friendly").slice(0, 100),
        "Scene: " + String(character.scenario || "A conversation is beginning.").slice(0, 1000),
        body.memory ? "Continuity notes: " + String(body.memory).slice(0, 1200) : ""
      ].filter(Boolean).join("\n");
      try {
        const result = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
          messages: [{ role: "system", content: system }, ...messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 4000) }))],
          max_tokens: 700,
          temperature: 0.85
        });
        const reply = result?.response || result?.result?.response || result?.output?.[0]?.content?.[0]?.text;
        if (!reply) return json({ error: "The chat model returned an empty response. Check model availability." }, 502);
        return json({ reply });
      } catch (e) {
        return json({ error: "Chat generation failed: " + String(e?.message || e).slice(0, 180) }, 502);
      }
    }

    if (url.pathname === "/api/image" && request.method === "POST") {
      if (!env.AI) return json({ error: "Workers AI binding is missing." }, 503);
      let body;
      try { body = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400); }
      const prompt = String(body.prompt || "").trim().slice(0, 1600);
      if (!prompt) return json({ error: "Enter an image prompt first." }, 400);
      try {
        const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
          prompt: prompt + ". Original fictional adult character portrait, tasteful styling, no real-person impersonation.",
          width: 1024,
          height: 1024,
          num_steps: 4
        });
        if (result instanceof Response) {
          const bytes = await result.arrayBuffer();
          return new Response(bytes, { headers: { "content-type": result.headers.get("content-type") || "image/png", "cache-control": "no-store" } });
        }
        if (result instanceof ArrayBuffer || ArrayBuffer.isView(result)) {
          return new Response(result, { headers: { "content-type": "image/png", "cache-control": "no-store" } });
        }
        if (result?.image) return json({ image: result.image, mimeType: result.mimeType || "image/png" });
        return json({ error: "The image model returned an unsupported response format. Check the selected model's output format." }, 502);
      } catch (e) {
        return json({ error: "Image generation failed: " + String(e?.message || e).slice(0, 180) }, 502);
      }
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "API route not found." }, 404);
    return env.ASSETS.fetch(request);
  }
};
