// Edge Function: ai-generate — Lovable AI Gateway (google/gemini-2.5-flash)
// Nunca expõe API key ao cliente. A key vive como secret LOVABLE_API_KEY.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const { prompt, system } = await req.json()
    if (!prompt) return new Response(JSON.stringify({ error: "prompt em falta" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } })

    const apiKey = Deno.env.get("LOVABLE_API_KEY")
    if (!apiKey) return new Response(JSON.stringify({ error: "IA não configurada" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } })

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system ?? "É um assistente de pousada acolhedor. Responda em português europeu." },
          { role: "user", content: prompt },
        ],
      }),
    })
    if (!res.ok) return new Response(JSON.stringify({ error: "Falha no gateway de IA" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ""
    return new Response(JSON.stringify({ text }), { headers: { ...cors, "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } })
  }
})
