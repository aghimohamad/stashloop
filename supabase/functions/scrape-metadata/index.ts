import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";


/** ---------- CORS ---------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

/** ---------- Helpers ---------- */
function domainOf(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, "") } catch { return null }
}

/** ---------- Function ---------- */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = req.headers.get("Authorization") ?? ""
    if (!auth) return new Response("Unauthorized", { headers: corsHeaders, status: 401 })

    const { itemId, url } = await req.json().catch(() => ({}))
    if (!itemId || !url) return new Response("Bad request", { headers: corsHeaders, status: 400 })

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    )

    // Check that the item belongs to the user
    const { data: row, error: getErr } = await supabase
      .from("items")
      .select("id")
      .eq("id", itemId)
      .single()
    if (getErr || !row)
      return new Response("Not found", { headers: corsHeaders, status: 404 })

    /** ---------- Call Peekalink ---------- */
    let title: string | null = null
    let description: string | null = null
    let thumb_url: string | null = null
    let domain: string | null = null
    let type: string | null = "other"

    try {
      const res = await fetch("https://api.peekalink.io/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("EXPO_PUBLIC_PEEKALINK_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ link: url }),
      })

      if (res.ok) {
        const data = await res.json()
        title = data.title ?? null
        description = data.description ?? null
        thumb_url = data.image?.thumbnail?.url ?? null
        domain = data.domain ?? domainOf(url)
        type = data.type ?? "other"
      } else {
        console.warn("Peekalink error", await res.text())
        domain = domainOf(url)
      }
    } catch (err) {
      console.error("Peekalink fetch failed", err)
      domain = domainOf(url)
    }

    /** ---------- Update item ---------- */
    const { error: updErr } = await supabase
      .from("items")
      .update({ title, description, thumb_url, domain, type })
      .eq("id", itemId)

    if (updErr)
      return new Response(updErr.message, { headers: corsHeaders, status: 500 })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (e) {
    return new Response(`Internal Error: ${String(e)}`, {
      headers: corsHeaders,
      status: 500,
    })
  }
})
