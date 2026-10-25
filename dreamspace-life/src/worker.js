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

    if (url.pathname === "/api/video-generate" && request.method === "POST") {
      if (!env.NURETA_API_KEY) return json({ error: "Video generation is not configured. Add NURETA_API_KEY as a Cloudflare Worker secret." }, 503);
      let body;
      try { body = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400); }
      if (body.ageConfirmed !== true) return json({ error: "Confirm that you are 18 or older first." }, 403);
      const prompt = String(body.prompt || "").trim().slice(0, 3000);
      const model = ["seahorse-480p", "seahorse-720p", "seahorse-1080p"].includes(body.model) ? body.model : "seahorse-480p";
      const duration = [5, 8, 10, 12, 15].includes(Number(body.duration)) ? Number(body.duration) : 5;
      if (!prompt) return json({ error: "Enter a scene prompt first." }, 400);
      const prohibited = /\b(minor|underage|child|children|teenager|schoolgirl|schoolboy|non[- ]consensual|rape|revenge porn|deepfake|undress|real person without consent)\b/i;
      if (prohibited.test(prompt)) return json({ error: "This prompt cannot be accepted. Use fictional adults and consensual, non-explicit romantic scenes only." }, 400);
      try {
        const upstream = await fetch("https://developer.nureta.ai/api/v3/contents/generations/tasks", {
          method: "POST",
          headers: { "authorization": "Bearer " + env.NURETA_API_KEY, "content-type": "application/json" },
          body: JSON.stringify({
            model,
            duration,
            ratio: ["16:9", "9:16", "1:1"].includes(body.ratio) ? body.ratio : "16:9",
            content: [{ type: "text", text: "Create a non-explicit cinematic romantic scene featuring clearly adult fictional characters. No nudity or explicit sexual acts. Scene: " + prompt }]
          })
        });
        const data = await upstream.json().catch(() => ({}));
        if (!upstream.ok) return json({ error: data.message || data.error || "The video provider rejected the request (HTTP " + upstream.status + ")." }, upstream.status >= 500 ? 502 : 400);
        if (!data.id) return json({ error: "The video provider did not return a task ID." }, 502);
        return json({ id: data.id, status: data.status || "pending", model, duration });
      } catch (e) {
        return json({ error: "Could not reach the video provider: " + String(e?.message || e).slice(0, 160) }, 502);
      }
    }

    if (url.pathname === "/api/video-status" && request.method === "GET") {
      if (!env.NURETA_API_KEY) return json({ error: "Video generation is not configured. Add NURETA_API_KEY as a Cloudflare Worker secret." }, 503);
      const id = String(url.searchParams.get("id") || "");
      if (!/^cgt-[A-Za-z0-9_-]+$/.test(id)) return json({ error: "A valid task ID is required." }, 400);
      try {
        const upstream = await fetch("https://developer.nureta.ai/api/v3/contents/generations/tasks/" + encodeURIComponent(id), {
          headers: { "authorization": "Bearer " + env.NURETA_API_KEY }
        });
        const data = await upstream.json().catch(() => ({}));
        if (!upstream.ok) return json({ error: data.message || data.error || "Could not retrieve video task." }, upstream.status >= 500 ? 502 : 400);
        return json({
          id: data.id,
          status: data.status,
          step: data.step || null,
          video_url: data.status === "succeeded" ? (data.content?.video_url || null) : null,
          error: data.status === "failed" ? (data.error?.message || data.error || "Video generation failed.") : null
        });
      } catch (e) {
        return json({ error: "Could not reach the video provider: " + String(e?.message || e).slice(0, 160) }, 502);
      }
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "API route not found." }, 404);
    return env.ASSETS.fetch(request);
  }
};
