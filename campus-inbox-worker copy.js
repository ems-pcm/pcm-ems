/* =====================================================================
   Campus Desk — Public Inbox (Cloudflare Worker)
   A tiny, free server that collects public submissions securely.

   - POST /submit   : anyone (a visitor's phone) can ADD one submission.
                      Optional shared token blocks random spam.
   - GET  /list      : ONLY the admin (who knows ADMIN_KEY) can read them.
   - POST /clear     : ONLY the admin can wipe the inbox.

   Visitors can never read or modify your data — they can only append.

   ---------------------------------------------------------------------
   SETUP (5 minutes, free):
   1. Create a free Cloudflare account → Workers & Pages → Create Worker.
   2. Paste this whole file as the Worker code and Deploy.
   3. Workers & Pages → your worker → Settings → Variables:
        - Add a KV namespace binding named   INBOX   (create one under
          Storage & Databases → KV, then bind it here).
        - Add a Secret  ADMIN_KEY  = a long random string (your read key).
        - (optional) Add a Secret  SUBMIT_TOKEN = a shared anti-spam token.
   4. Copy your worker URL, e.g.  https://campus-inbox.<you>.workers.dev
   5. In Campus Desk → Settings → "Public data collection (server)":
        - Inbox server URL   = that worker URL
        - Admin read key     = the ADMIN_KEY you set
        - Submit token       = the SUBMIT_TOKEN (if you set one)
        Save, then regenerate each entrance exam's QR / link.
   ===================================================================== */

const CORS = {
  "Access-Control-Allow-Origin": "*",            // or set to your GitHub Pages origin
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

export default {
  async fetch(request, env) {
   try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    if (request.method === "OPTIONS")
      return new Response(null, { headers: CORS });

    // Storage check: every data route needs the KV namespace bound as INBOX.
    const needsKV = /\/(submit|list|clear)$/.test(path);
    if (needsKV && !env.INBOX)
      return json({ error: "Setup incomplete: bind a KV namespace named INBOX to this Worker (Settings → Variables/Bindings)." }, 500);

    // ---- public: append one submission ----
    if (request.method === "POST" && path.endsWith("/submit")) {
      let body;
      try { body = JSON.parse(await request.text()); }
      catch { return json({ error: "bad json" }, 400); }

      // optional anti-spam token
      if (env.SUBMIT_TOKEN && body.token !== env.SUBMIT_TOKEN)
        return json({ error: "forbidden" }, 403);

      // basic shape + size guard (≈256 KB)
      const raw = JSON.stringify(body.record || {});
      if (!body.record || raw.length > 256 * 1024)
        return json({ error: "invalid record" }, 400);

      const seq = (Number(await env.INBOX.get("seq")) || 0) + 1;
      await env.INBOX.put("seq", String(seq));
      await env.INBOX.put("item:" + String(seq).padStart(12, "0"), JSON.stringify({
        id: String(seq), seq, kind: body.kind || "application",
        at: body.at || new Date().toISOString(), record: body.record,
      }));
      return json({ ok: true, seq }, 200);
    }

    // ---- admin only: read new submissions ----
    if (request.method === "GET" && path.endsWith("/list")) {
      if (url.searchParams.get("key") !== env.ADMIN_KEY)
        return json({ error: "unauthorized" }, 401);
      const since = Number(url.searchParams.get("since") || 0);
      const out = [];
      let cursor;
      do {
        const page = await env.INBOX.list({ prefix: "item:", cursor });
        for (const k of page.keys) {
          const seq = Number(k.name.split(":")[1]);
          if (seq > since) {
            const v = await env.INBOX.get(k.name);
            if (v) out.push(JSON.parse(v));
          }
        }
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
      out.sort((a, b) => a.seq - b.seq);
      return json(out, 200);
    }

    // ---- admin only: clear inbox ----
    if (request.method === "POST" && path.endsWith("/clear")) {
      if (url.searchParams.get("key") !== env.ADMIN_KEY)
        return json({ error: "unauthorized" }, 401);
      let cursor, removed = 0;
      do {
        const page = await env.INBOX.list({ prefix: "item:", cursor });
        for (const k of page.keys) { await env.INBOX.delete(k.name); removed++; }
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
      return json({ ok: true, removed }, 200);
    }

    return json({ ok: true, service: "campus-desk-inbox" }, 200);
   } catch (err) {
    // Always return CORS headers, even on error, so the browser shows a real message.
    return json({ error: "Worker error: " + (err && err.message ? err.message : String(err)) }, 500);
   }
  },
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}