// supabase/functions/fill-today/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const AUTH_HEADER = "x-cron-secret";

/**
 * Fills each user's "Today" list up to items_per_day using simple priority:
 * pinned+due > unseen oldest > snoozed due > backlog oldest, with domain diversity.
 * Invoke hourly via pg_cron, or call manually to test.
 */
Deno.serve(async (req) => {
  // cron-only auth
  if (req.headers.get(AUTH_HEADER) !== Deno.env.get("CRON_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get all users' settings (you can later filter by timezone/hour)
  const { data: settings, error } = await supabase
    .from("user_settings")
    .select("user_id, items_per_day");

  if (error || !settings) {
    return new Response(JSON.stringify({ error: error?.message }), { status: 500 });
  }

  for (const s of settings) {
    const userId = s.user_id;

    // How many items are already in Today?
    const { data: count, error: cntErr } = await supabase
      .rpc("count_today_items", { in_user: userId });
    if (cntErr) continue;

    const deficit = Math.max(0, (s.items_per_day ?? 3) - (count ?? 0));
    if (deficit <= 0) continue;

    // Get candidates (oversample for diversity)
    const { data: candidates, error: pickErr } = await supabase
      .rpc("pick_candidates", { in_user: userId, in_limit: deficit + 4 });
    if (pickErr || !candidates?.length) continue;

    // Domain diversity: avoid multiple from same domain if possible
    const chosen: any[] = [];
    const seenDomains = new Set<string>();
    for (const c of candidates) {
      const d = (c.domain ?? "unknown") as string;
      if (!seenDomains.has(d) || chosen.length === 0) {
        chosen.push(c);
        seenDomains.add(d);
      }
      if (chosen.length >= deficit) break;
    }

    if (chosen.length) {
      const ids = chosen.map((c) => c.id);
      await supabase.from("items").update({ status: "today" }).in("id", ids);
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
