// supabase/functions/send-test-push/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const auth = req.headers.get("Authorization") ?? ""
  const cron = req.headers.get("x-cron-secret") ?? ""
  const isServiceRole =
    auth.startsWith("Bearer ") &&
    auth.slice(7) === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  const isCron = cron && cron === Deno.env.get("CRON_SECRET")

  // If called by scheduler/pg_net with service-role or cron secret → admin branch
  if (isServiceRole || isCron) {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Optional: allow targeting a specific user_id via JSON body
    let targetUserId: string | null = null
    try {
      const body = await req.json()
      targetUserId = typeof body?.user_id === "string" ? body.user_id : null
    } catch {}

    const query = admin.from("device_tokens").select("token")
    const { data: tokens, error } = targetUserId
      ? await query.eq("user_id", targetUserId)
      : await query

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...cors, "Content-Type": "application/json" },
        status: 500,
      })
    }

    const to = (tokens ?? []).map((t) => t.token)
    if (!to.length) {
      return new Response(JSON.stringify({ ok: false, reason: "no_tokens" }), {
        headers: { ...cors, "Content-Type": "application/json" },
        status: 200,
      })
    }

    const chunk = to.map((t) => ({
      to: t,
      sound: "default",
      title: "Test notification",
      body: "It works 🎉",
    }))

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    })

    return new Response(JSON.stringify({ ok: true, sent: to.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
      status: 200,
    })
  }

  // User branch (requires real user JWT)
  if (!auth) return new Response("Unauthorized", { headers: cors, status: 401 })

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { headers: cors, status: 401 })

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("token")
    .eq("user_id", user.id)

  const to = (tokens ?? []).map((t) => t.token)
  if (!to.length) {
    return new Response(JSON.stringify({ ok: false, reason: "no_tokens" }), {
      headers: { ...cors, "Content-Type": "application/json" },
      status: 200,
    })
  }

  const chunk = to.map((t) => ({
    to: t,
    sound: "default",
    title: "Test notification",
    body: "It works 🎉",
  }))

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chunk),
  })

  return new Response(JSON.stringify({ ok: true, sent: to.length }), {
    headers: { ...cors, "Content-Type": "application/json" },
    status: 200,
  })
})
