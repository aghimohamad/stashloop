// supabase/functions/fill-today/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const cronSecret = req.headers.get("x-cron-secret")
  const auth = req.headers.get("Authorization")

  try {
    // Cron → all users
    if (cronSecret && cronSecret === Deno.env.get("CRON_SECRET")) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      )

      const { data, error } = await admin.rpc('fill_today_all')
      if (error) throw new Error(error.message)

      return new Response(JSON.stringify({ ok: true, result: data }), {
        headers: { ...cors, "Content-Type": "application/json" }, status: 200
      })
    }
    console.log(auth , 'auth')
    // User → just me
    if (!auth) return new Response("Unauthorized", { headers: cors, status: 402 })

    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    )
    const { data: { user } } = await client.auth.getUser()
    console.log(user , 'user')

    if (!user) return new Response("Unauthorized", { headers: cors, status: 403 })

    const { data, error } = await client.rpc('fill_today_for_user', { p_user_id: user.id })
    if (error) throw new Error(error.message)

    return new Response(JSON.stringify({ ok: true, result: data }), {
      headers: { ...cors, "Content-Type": "application/json" }, status: 200
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...cors, "Content-Type": "application/json" }, status: 500
    })
  }
})
