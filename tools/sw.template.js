/* Service worker de Visage : garde l'app sur le téléphone pour qu'elle marche sans connexion,
   et récupère la nouvelle version en ligne à chaque ouverture. */
const FILES = __FILES__;
const CACHE = "visage";
const SCOPE = self.registration.scope;
const BASE = new URL(SCOPE).pathname;
const keyOf = p => new URL(p, SCOPE).href + "?v=" + FILES[p];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const p of Object.keys(FILES)){
      const k = keyOf(p);
      if (await c.match(k)) continue;
      try { const r = await fetch(k, {cache: "no-cache"}); if (r.ok && r.status === 200) await c.put(k, r); } catch(err){}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE), keep = new Set(Object.keys(FILES).map(keyOf));
    for (const req of await c.keys()) if (!keep.has(req.url)) await c.delete(req);
    await self.clients.claim();
  })());
});

async function fromCache(p){
  const c = await caches.open(CACHE);
  return (FILES[p] && await c.match(keyOf(p))) || null;
}

// Page : la version en ligne d'abord (3,5 s au plus), sinon celle gardée sur le téléphone.
async function page(req){
  try {
    const net = await Promise.race([fetch(req, {cache: "no-cache"}), new Promise((_, no) => setTimeout(() => no(new Error("lent")), 3500))]);
    if (net.ok) return net;
  } catch(err){}
  const hit = await fromCache("index.html");
  if (hit) return hit;
  const c = await caches.open(CACHE);
  for (const k of await c.keys()) if (k.url.includes("/index.html?v=")) return c.match(k);
  return fetch(req);
}

// Les vidéos sont demandées par morceaux : on découpe la copie gardée.
async function ranged(resp, range){
  const buf = await resp.arrayBuffer(), n = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let a = m[1] ? parseInt(m[1], 10) : 0, b = m[2] ? parseInt(m[2], 10) : n - 1;
  if (!m[1] && m[2]){ a = Math.max(0, n - parseInt(m[2], 10)); b = n - 1; }
  b = Math.min(b, n - 1);
  if (a > b) return new Response(null, {status: 416, headers: {"Content-Range": "bytes */" + n}});
  return new Response(buf.slice(a, b + 1), {status: 206, headers: {
    "Content-Type": resp.headers.get("Content-Type") || "video/mp4",
    "Content-Range": `bytes ${a}-${b}/${n}`, "Content-Length": String(b - a + 1), "Accept-Ranges": "bytes"}});
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin || !u.pathname.startsWith(BASE)) return;
  if (req.mode === "navigate"){ e.respondWith(page(req)); return; }
  const p = decodeURIComponent(u.pathname.slice(BASE.length)) || "index.html";
  if (!FILES[p]) return;
  e.respondWith((async () => {
    const hit = await fromCache(p);
    const range = req.headers.get("range");
    if (hit) return range ? ranged(hit, range) : hit;
    const net = await fetch(req);
    if (net.ok && net.status === 200 && !range){ const c = await caches.open(CACHE); c.put(keyOf(p), net.clone()); }
    return net;
  })());
});
