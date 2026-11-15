import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" }
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers })
  if (req.method !== "POST") return reply({ error: "Método inválido" }, 405)
  try {
    const url = Deno.env.get("SUPABASE_URL")!
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const jwt = req.headers.get("Authorization")?.replace(/^Bearer /i, "")
    if (!jwt) return reply({ error: "Sessão necessária" }, 401)
    const admin = createClient(url, key)
    const { data: { user }, error: authError } = await admin.auth.getUser(jwt)
    if (authError || !user) return reply({ error: "Sessão inválida" }, 401)
    const { reserva_id } = await req.json()
    if (typeof reserva_id !== "string" || !/^[\da-f-]{36}$/i.test(reserva_id)) return reply({ error: "Reserva inválida" }, 400)
    const { data: r } = await admin.from("reservas").select("id,user_id,quarto_id,estado,valor_total,codigo_reserva,checkout_url,pagamento_estado").eq("id", reserva_id).eq("user_id", user.id).single()
    if (!r || r.estado === "cancelada") return reply({ error: "Reserva não encontrada ou cancelada" }, 404)
    if (r.pagamento_estado === "pago") return reply({ error: "Pagamento já confirmado" }, 409)
    if (r.checkout_url) return reply({ url: r.checkout_url })
    const { data: p } = await admin.from("profiles").select("infinitepay_handle,nome_pousada").eq("id", user.id).single()
    const handle = p?.infinitepay_handle?.trim()
    // Mapeamento privado por utilizador, nunca enviado pelo cliente e nunca guardado no profile.
    const keys = JSON.parse(Deno.env.get("INFINITEPAY_MERCHANT_KEYS") || "{}") as Record<string, string>
    const merchantKey = keys[user.id]
    if (!handle || !merchantKey) return reply({ error: "InfinitePay ainda não ativada para esta pousada; use a cobrança manual." }, 409)
    const origin = Deno.env.get("PUBLIC_SITE_URL")
    if (!origin || !origin.startsWith("https://")) return reply({ error: "Endereço público não configurado" }, 503)
    const amount = Math.round(Number(r.valor_total) * 100)
    if (!Number.isSafeInteger(amount) || amount < 100) return reply({ error: "Valor inválido" }, 400)
    const checkout = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Api-Key": merchantKey },
      body: JSON.stringify({ handle, order_nsu: r.id, items: [{ description: `Reserva ${r.codigo_reserva} — ${p.nome_pousada}`, quantity: 1, price: amount }],
        redirect_url: `${origin.replace(/\/$/, "")}/app/reservas`,
        webhook: { url: `${url}/functions/v1/infinitepay-webhook`, events: ["paid"] },
        options: { single_payment: true, payment_methods_enabled: ["credit_card", "pix"] } }),
    })
    if (!checkout.ok) return reply({ error: "Não foi possível criar o checkout na InfinitePay" }, 502)
    const result = await checkout.json()
    const checkoutUrl = result.checkout_url
    if (typeof checkoutUrl !== "string" || !checkoutUrl.startsWith("https://")) return reply({ error: "Checkout inválido" }, 502)
    const { error } = await admin.from("reservas").update({ checkout_url: checkoutUrl, pagamento_estado: "aguarda_pagamento" }).eq("id", r.id).eq("pagamento_estado", "nao_iniciado")
    if (error) return reply({ error: "Não foi possível guardar o link de pagamento" }, 500)
    return reply({ url: checkoutUrl })
  } catch { return reply({ error: "Erro ao preparar o pagamento" }, 500) }
})
