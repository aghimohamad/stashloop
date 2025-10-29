// supabase/functions/send-push/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const AUTH_HEADER = "x-cron-secret"

async function sendExpo(tokens: string[], title: string, body: string) {
  // chunk by 90 (Expo's soft limit)
  for (let i = 0; i < tokens.length; i += 90) {
    const chunk = tokens.slice(i, i + 90).map(t => ({ to: t, sound: "default", title, body }))
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    })
  }
}

function isWithinReminderWindow(nowUTC: Date, reminderHour: number, tz: string) {
  // simple approximation: compute local hour by Intl API
  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz })
  const localHour = Number(fmt.format(nowUTC)) // 0..23
  // allow ±30 minutes; to keep it simple, match same hour
  return localHour === reminderHour
}

Deno.serve(async (req) => {
  if (req.headers.get(AUTH_HEADER) !== Deno.env.get("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const now = new Date()

  // 1) Get candidates from user_settings
  const { data: settings, error: sErr } = await supabase
    .from("user_settings")
    .select("user_id, reminder_hour, timezone, push_opt_in, last_push_at")
    .eq("push_opt_in", true)

  if (sErr || !settings) return new Response("settings error", { status: 500 })

  // build list of user_ids to notify
  const notifyIds: string[] = []
  for (const s of settings) {
    // skip if last_push_at is "today" in user's tz
    if (s.last_push_at) {
      const lastStr = new Intl.DateTimeFormat('en-CA', { timeZone: s.timezone, dateStyle: 'short' }).format(new Date(s.last_push_at))
      const nowStr  = new Intl.DateTimeFormat('en-CA', { timeZone: s.timezone, dateStyle: 'short' }).format(now)
      if (lastStr === nowStr) continue
    }
    if (!isWithinReminderWindow(now, s.reminder_hour ?? 9, s.timezone ?? "Europe/Istanbul")) continue
    notifyIds.push(s.user_id)
  }
  if (notifyIds.length === 0) return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 })

  // 2) Filter to users who actually have TODAY items
  const { data: todayUsers } = await supabase
    .from("items")
    .select("user_id")
    .eq("status", "today")
    .in("user_id", notifyIds)

  const ids = Array.from(new Set((todayUsers ?? []).map(u => u.user_id)))
  if (ids.length === 0) return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 })

  // 3) Fetch tokens
  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("user_id, token")
    .in("user_id", ids)

  const byUser = new Map<string, string[]>()
  for (const t of (tokens ?? [])) {
    if (!byUser.has(t.user_id)) byUser.set(t.user_id, [])
    byUser.get(t.user_id)!.push(t.token)
  }

  // 4) Send pushes
  let sentCount = 0
  for (const uid of ids) {
    const tks = byUser.get(uid) ?? []
    if (tks.length === 0) continue

    await sendExpo(tks, "Your 3 saved gems are ready ✨", "Open StashLoop to review today’s picks.")
    sentCount += tks.length

    // 5) Mark last_push_at
    await supabase
      .from("user_settings")
      .update({ last_push_at: new Date().toISOString() })
      .eq("user_id", uid)
  }

  return new Response(JSON.stringify({ ok: true, sent: sentCount }), { status: 200 })
})
