// Deno type defs for Supabase Edge runtime
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/** ---------- CORS ---------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // tighten in prod if you have fixed origins
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/** ---------- URL / Domain helpers ---------- */
function hostname(u: string) {
  try { return new URL(u).hostname.toLowerCase(); } catch { return ""; }
}
function domainOf(u: string) {
  const h = hostname(u);
  return h.replace(/^www\./, "");
}
const isYouTube  = (u: string) => /(^|\.)youtube\.com$/.test(hostname(u)) || /(^|\.)youtu\.be$/.test(hostname(u));
const isVimeo    = (u: string) => /(^|\.)vimeo\.com$/.test(hostname(u));
const isTikTok   = (u: string) => /(^|\.)tiktok\.com$/.test(hostname(u));
const isReddit   = (u: string) => /(^|\.)reddit\.com$/.test(hostname(u));
const isFacebook = (u: string) => /(^|\.)facebook\.com$/.test(hostname(u));

/** ---------- Generic HTML meta scraping ---------- */
function meta(html: string, key: string, attr: "property" | "name" = "property") {
  const re = new RegExp(
    `<meta\\s+(?:${attr}=["']${key}["'])\\s+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  return html.match(re)?.[1] ?? null;
}
function firstImage(html: string) {
  for (const k of ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]) {
    const v = meta(html, k) || meta(html, k, "name");
    if (v) return v;
  }
  return null;
}

/** ---------- YouTube utils ---------- */
function extractYouTubeId(u: string): string | null {
  try {
    const url = new URL(u);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1) || null;
    const v = url.searchParams.get("v");
    if (v) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" && parts[1]) return parts[1];
    if (parts[0] === "embed" && parts[1]) return parts[1];
  } catch {}
  return null;
}
const ytThumb = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

/** ---------- Simple oEmbed fetchers (no API keys for these) ---------- */
async function oembed(url: string, endpoint: string) {
  const res = await fetch(`${endpoint}?url=${encodeURIComponent(url)}&format=json`, {
    headers: { "User-Agent": "StashLoopBot/1.0" },
  });
  if (!res.ok) throw new Error(`oEmbed ${endpoint} ${res.status}`);
  return res.json() as Promise<any>;
}

/** ---------- Facebook oEmbed (requires app creds) ---------- */
async function facebookOEmbed(url: string) {
  const id = Deno.env.get("FB_APP_ID");
  const secret = Deno.env.get("FB_APP_SECRET");
  if (!id || !secret) throw new Error("FB creds missing");
  const access_token = `${id}|${secret}`;
  const endpoints = [
    "https://graph.facebook.com/v19.0/oembed_video",
    "https://graph.facebook.com/v19.0/oembed_post",
    "https://graph.facebook.com/v19.0/oembed_page",
  ];
  for (const ep of endpoints) {
    const res = await fetch(
      `${ep}?url=${encodeURIComponent(url)}&access_token=${access_token}`,
      { headers: { "User-Agent": "StashLoopBot/1.0" } }
    );
    if (res.ok) return res.json() as Promise<any>;
  }
  throw new Error("FB oEmbed failed");
}

/** ---------- Type inference ---------- */
function inferType(u: string, ogType?: string | null) {
  if (isYouTube(u) || isVimeo(u) || isTikTok(u)) return "video";
  if (ogType && ogType.toLowerCase().includes("video")) return "video";
  if (ogType && ogType.toLowerCase().includes("article")) return "article";
  if (/x\.com|twitter\.com|linkedin\.com|instagram\.com|facebook\.com|reddit\.com/.test(u)) return "post";
  return "other";
}

/** ---------- Handler ---------- */
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return new Response("Unauthorized", { headers: corsHeaders, status: 401 });

    const { itemId, url } = await req.json().catch(() => ({}));
    if (!itemId || !url) return new Response("Bad request", { headers: corsHeaders, status: 400 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );

    // Ensure row exists & caller can see it (RLS also enforces)
    const { data: row, error: getErr } = await supabase
      .from("items")
      .select("id")
      .eq("id", itemId)
      .single();
    if (getErr || !row) return new Response("Not found", { headers: corsHeaders, status: 404 });

    const domain = domainOf(url);
    let title: string | null = null;
    let description: string | null = null;
    let thumb_url: string | null = null;
    let ogType: string | null = null;
    let finalType = "other";

    /** ---- 1) YouTube via oEmbed + thumbnail fallback ---- */
    if (isYouTube(url)) {
      try {
        const data = await oembed(url, "https://www.youtube.com/oembed");
        title = data.title ?? null;
        description = data.author_name ? `by ${data.author_name}` : null;
        thumb_url = data.thumbnail_url ?? null;
        if (!thumb_url) {
          const id = extractYouTubeId(url);
          if (id) thumb_url = ytThumb(id);
        }
        finalType = "video";
      } catch {
        // fall through to generic
      }
    }

    /** ---- 2) Vimeo ---- */
    if (!title && isVimeo(url)) {
      try {
        const data = await oembed(url, "https://vimeo.com/api/oembed.json");
        title = data.title ?? null;
        description = data.author_name ? `by ${data.author_name}` : null;
        thumb_url = data.thumbnail_url ?? null;
        finalType = "video";
      } catch {}
    }

    /** ---- 3) TikTok ---- */
    if (!title && isTikTok(url)) {
      try {
        const data = await oembed(url, "https://www.tiktok.com/oembed");
        title = data.title ?? null;
        description = data.author_name ? `by ${data.author_name}` : null;
        thumb_url = data.thumbnail_url ?? null;
        finalType = "video";
      } catch {}
    }

    /** ---- 4) Reddit ---- */
    if (!title && isReddit(url)) {
      try {
        const data = await oembed(url, "https://www.reddit.com/oembed");
        title = data.title ?? null;
        description = data.author_name ? `by ${data.author_name}` : null;
        thumb_url = data.thumbnail_url ?? null;
        finalType = "post";
      } catch {}
    }

    /** ---- 5) Facebook (needs FB_APP_ID / FB_APP_SECRET) ---- */
    if (!title && isFacebook(url)) {
      try {
        const data = await facebookOEmbed(url);
        title = data.title ?? null;
        description = data.author_name ? `by ${data.author_name}` : (data.provider_name ?? "Facebook");
        thumb_url = data.thumbnail_url ?? null; // not always present
        finalType = data.type === "video" ? "video" : "post";
      } catch {
        // No creds or private content → fall back to generic; likely minimal
      }
    }

    /** ---- 6) Generic HTML OG/Twitter fallback ---- */
    if (!title && !description && !thumb_url) {
      try {
        const res = await fetch(url, { headers: { "User-Agent": "StashLoopBot/1.0" } });
        const html = await res.text();
        title =
          meta(html, "og:title") ||
          meta(html, "twitter:title", "name") ||
          (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null);
        description =
          meta(html, "og:description") ||
          meta(html, "twitter:description", "name");
        thumb_url = firstImage(html);
        ogType = meta(html, "og:type");
      } catch {
        // ignore
      }
      finalType = inferType(url, ogType);
    }

    /** ---- Persist ---- */
    const { error: updErr } = await supabase
      .from("items")
      .update({ title, description, thumb_url, domain, type: finalType })
      .eq("id", itemId);

    if (updErr) {
      return new Response(updErr.message, { headers: corsHeaders, status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(`Internal Error: ${String(e)}`, {
      headers: corsHeaders,
      status: 500,
    });
  }
});
