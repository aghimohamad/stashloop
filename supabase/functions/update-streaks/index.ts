// supabase/functions/update-streaks/index.ts
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
    // Cron mode (all users)
    if (cronSecret && cronSecret === Deno.env.get("CRON_SECRET")) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      )

      // Pull all user_ids that have settings
      const { data: users, error } = await admin
        .from("user_settings")
        .select("user_id")
      if (error) throw error

      let updated = 0
      for (const u of users ?? []) {
        const { error: rpcErr } = await admin.rpc("update_streaks_for_user", { p_user_id: u.user_id })
        if (!rpcErr) updated++
      }

      return new Response(JSON.stringify({ ok: true, updated }), {
        headers: { ...cors, "Content-Type": "application/json" },
        status: 200,
      })
    }

    // User mode (current user only)
    if (!auth) return new Response("Unauthorized", { headers: cors, status: 401 })

    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    )

    const { data: { user } } = await client.auth.getUser()
    if (!user) return new Response("Unauthorized", { headers: cors, status: 401 })

    const { data, error } = await client.rpc("update_streaks_for_user", { p_user_id: user.id })
    if (error) throw error

    return new Response(JSON.stringify({ ok: true, user: user.id, data }), {
      headers: { ...cors, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...cors, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
