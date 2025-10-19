import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function domainOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

function inferType(u: string, ogType?: string | null) {
  if (/youtube|youtu\.be|vimeo/.test(u)) return "video";
  if (ogType && ogType.toLowerCase().includes("video")) return "video";
  if (ogType && ogType.toLowerCase().includes("article")) return "article";
  if (/x\.com|twitter\.com|reddit\.com|linkedin\.com|instagram\.com|tiktok\.com/.test(u)) return "post";
  return "other";
}

function meta(html: string, key: string, attr: "property"|"name" = "property") {
  const re = new RegExp(`<meta\\s+(?:${attr}=["']${key}["'])\\s+content=["']([^"']+)["'][^>]*>`, "i");
  return html.match(re)?.[1] ?? null;
}
function firstImage(html: string) {
  for (const k of ['og:image','og:image:url','twitter:image','twitter:image:src']) {
    const v = meta(html, k) || meta(html, k, "name");
    if (v) return v;
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return new Response("Unauthorized", { status: 401 });

    const { itemId, url } = await req.json().catch(() => ({}));
    if (!itemId || !url) return new Response("Bad request", { status: 400 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );

    // Ensure the row exists & caller has access (RLS still protects reads/writes)
    const { data: row, error: getErr } = await supabase.from("items").select("id").eq("id", itemId).single();
    if (getErr || !row) return new Response("Not found", { status: 404 });

    let title: string | null = null, description: string | null = null, thumb_url: string | null = null, ogType: string | null = null;

    try {
      const res = await fetch(url, { headers: { "User-Agent": "StashLoopBot/1.0" } });
      const html = await res.text();
      title =
        meta(html, "og:title") || meta(html, "twitter:title", "name") ||
        (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null);
      description = meta(html, "og:description") || meta(html, "twitter:description", "name");
      thumb_url = firstImage(html);
      ogType = meta(html, "og:type");
    } catch {
      // OK to fail silently; we’ll still set domain/type.
    }

    const domain = domainOf(url);
    const type = inferType(url, ogType);

    const { error: updErr } = await supabase
      .from("items")
      .update({ title, description, thumb_url, domain, type })
      .eq("id", itemId);

    if (updErr) return new Response(updErr.message, { status: 500 });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (e) {
    return new Response(`Internal Error: ${String(e)}`, { status: 500 });
  }
});
