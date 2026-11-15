import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

// Endpoint público: NUNCA confiar no payload. Confirmar com a InfinitePay antes de alterar o pagamento.
serve(async req => {
  if (req.method !== "POST") return reply({ error: "Método inválido" }, 405)
  try {
    const event = await req.json()
    const { order_nsu, transaction_nsu, invoice_slug } = event
    if (typeof order_nsu !== "string" || !/^[\da-f-]{36}$/i.test(order_nsu) ||
        typeof transaction_nsu !== "string" || typeof invoice_slug !== "string") return reply({ error: "Evento inválido" }, 400)
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: r } = await admin.from("reservas").select("id,user_id,valor_total,pagamento_estado,estado").eq("id", order_nsu).single()
    if (!r || r.estado === "cancelada" || r.pagamento_estado === "nao_iniciado") return reply({ error: "Reserva não elegível" }, 400)
    if (r.pagamento_estado === "pago") return reply({ ok: true })
    const { data: p } = await admin.from("profiles").select("infinitepay_handle").eq("id", r.user_id).single()
    const keys = JSON.parse(Deno.env.get("INFINITEPAY_MERCHANT_KEYS") || "{}") as Record<string, string>
    const merchantKey = keys[r.user_id]
    if (!p?.infinitepay_handle || !merchantKey) return reply({ error: "Conta não configurada" }, 400)
    const check = await fetch("https://api.checkout.infinitepay.io/payment_check", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Api-Key": merchantKey },
      body: JSON.stringify({ handle: p.infinitepay_handle, order_nsu, transaction_nsu, slug: invoice_slug }),
    })
    if (!check.ok) return reply({ error: "Falha na verificação" }, 502)
    const result = await check.json()
    if (result.paid !== true || result.success !== true || Number(result.amount) !== Math.round(Number(r.valor_total) * 100))
      return reply({ error: "Pagamento não confirmado ou valor divergente" }, 400)
    const { error } = await admin.from("reservas").update({ pagamento_estado: "pago", transaction_nsu }).eq("id", r.id).eq("pagamento_estado", "aguarda_pagamento")
    if (error) return reply({ error: "Falha ao guardar confirmação" }, 500)
    return reply({ ok: true })
  } catch { return reply({ error: "Erro ao verificar pagamento" }, 400) }
})
