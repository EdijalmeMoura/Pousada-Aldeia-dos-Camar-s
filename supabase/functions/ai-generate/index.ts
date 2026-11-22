// Lovable AI Gateway: apenas para utilizadores autenticados, com quota no servidor.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
}
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })
const defaultSystem = "É um assistente de pousada acolhedor. Responda em português europeu, de forma breve e respeitosa. Nunca invente códigos de quarto, pagamentos confirmados ou informações pessoais."

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return reply({ error: "Método inválido" }, 405)
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer /i, "")
    if (!token) return reply({ error: "Sessão necessária" }, 401)
    const url = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const aiKey = Deno.env.get("LOVABLE_API_KEY")
    if (!url || !serviceKey || !aiKey) return reply({ error: "IA indisponível" }, 503)
    const admin = createClient(url, serviceKey)
    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) return reply({ error: "Sessão inválida" }, 401)
    const body = await req.json()
    if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 4000 ||
        (body.system !== undefined && (typeof body.system !== "string" || body.system.length > 1000))) {
      return reply({ error: "Pedido inválido ou demasiado longo" }, 400)
    }
    // Falha fechada se a migração de quota não estiver aplicada.
    const { data: allowed, error: quotaError } = await admin.rpc("consume_ai_quota", { p_user_id: user.id })
    if (quotaError) return reply({ error: "Quota de IA indisponível" }, 503)
    if (!allowed) return reply({ error: "Limite diário de IA atingido" }, 429)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)
    let response: Response
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [
          { role: "system", content: body.system || defaultSystem },
          { role: "user", content: body.prompt },
        ] }),
        signal: controller.signal,
      })
    } finally { clearTimeout(timeout) }
    if (!response.ok) return reply({ error: "IA temporariamente indisponível" }, 502)
    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (typeof text !== "string" || !text.trim()) return reply({ error: "Resposta de IA vazia" }, 502)
    return reply({ text })
  } catch { return reply({ error: "Não foi possível gerar a resposta" }, 500) }
})
