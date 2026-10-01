/* ---------- Reprise de la progression : quand l'app Android passe de sa copie locale à la version en ligne,
   elle transmet les routines cochées, favoris et réglages dans l'ancre #import=, fusionnés ici ---------- */
(function importProgress(){
  const m = /^#import=(.+)$/.exec(location.hash || "");
  if (!m) return;
  try {
    const d = JSON.parse(decodeURIComponent(m[1]));
    const rd = k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } };
    for (const k in d){
      if (!/^pv-/.test(k) || k === "pv-sync") continue;
      const cur = localStorage.getItem(k);
      if (cur === null){ localStorage.setItem(k, d[k]); continue; }
      let v; try { v = JSON.parse(d[k]); } catch(e){ continue; }
      if (k === "pv-done"){ const a = rd(k) || {}; for (const day in v) a[day] = [...new Set([...(a[day] || []), ...(v[day] || [])])]; localStorage.setItem(k, JSON.stringify(a)); }
      else if (k === "pv-fav"){ const a = rd(k) || []; localStorage.setItem(k, JSON.stringify([...new Set([...a, ...v])])); }
      else if (k === "pv-start"){ const a = rd(k); if (typeof v === "string" && (!a || v < a)) localStorage.setItem(k, JSON.stringify(v)); }
    }
  } catch(e){}
  try { history.replaceState(null, "", location.pathname + location.search); } catch(e){}
})();


/* ---------- Médias ---------- */
const MEDIA = {
  front: "media/front.jpg", profile: "media/profile.jpg",
  cover: r => `media/cover-${r}.jpg`, g: id => `media/g/${id}.jpg`, v: id => `media/v/${id}.mp4`
};
const VB = { face: [400, 600], profil: [400, 533.33] };
/* Portraits de référence des tracés : tant que l'un manque, le mode Tracé est masqué pour les gestes concernés */
const HAVE = { front: false, profile: false };
["front", "profile"].forEach(k => { const im = new Image(); im.onload = () => { HAVE[k] = true; }; im.src = MEDIA[k]; });
const canTrace = T => T.vue === "profil" ? HAVE.profile : HAVE.front;
const modeFor = T => canTrace(T) ? store.get("pv-media", "video") : "video";

/* Tracés recalés sur les photos de référence (coordonnées de l'image ramenée à 400 px de large) */
const ANIM = {
  "respiration":[{t:"breathe",at:[200,548]}],
  "terminus":[{t:"pump",d:"M142,462 L128,474",mirror:true,dur:1500}],
  "cou-lateral":[{t:"glide",d:"M106,302 C118,350 134,400 142,462",mirror:true,dur:3000}],
  "menton-dessous":[{t:"glide",d:"M200,398 C182,396 162,386 142,366",mirror:true,dur:2200}],
  "machoire-drain":[{t:"glide",d:"M190,388 C160,378 132,352 114,314 C122,360 134,410 142,462",mirror:true,dur:3400}],
  "pommettes-drain":[{t:"glide",d:"M180,282 C160,282 132,270 108,256 C104,272 104,288 106,302",mirror:true,dur:2800}],
  "yeux-drain":[{t:"glide",d:"M178,238 C166,246 146,246 130,238 C120,232 113,238 110,250 C108,260 108,270 108,280",mirror:true,dur:2800}],
  "front-drain":[{t:"glide",d:"M196,132 C172,126 140,132 122,150 C112,168 110,210 108,246",mirror:true,dur:2800}],
  "froid":[{t:"hold",pts:[[153,244],[138,270]],mirror:true,seq:true,dur:2000}],
  "temporal":[{t:"hold",pts:[[116,168]],mirror:true},{t:"jaw",at:[200,430]}],
  "masseter":[{t:"hold",pts:[[126,296]],mirror:true},{t:"circles",pts:[[126,296]],r:10,mirror:true,dur:1800},{t:"jaw",at:[200,430]}],
  "froncement":[{t:"pinch",pts:[[186,188],[170,183],[152,182],[134,186]],mirror:true,dur:800}],
  "cuir-chevelu":[{t:"circles",pts:[[150,80],[200,64],[250,80],[114,122],[286,122]],r:8,dur:1400}],
  "nasogenien":[{t:"hold",pts:[[182,292],[175,308],[168,322]],seq:true,mirror:true,dur:1800}],
  "buccal":[{t:"inside",at:[150,316],r:22},{t:"pinch",pts:[[166,330],[150,316],[134,302]],dur:950}],
  "sterno":[{t:"pinch",pts:[[112,318],[124,358],[140,398],[158,438],[178,476]],dur:850}],
  "joues-lift":[{t:"lift",pts:[[146,262]],mirror:true,dur:2800}],
  "joues-sculpt":[{t:"glide",d:"M168,322 C158,300 148,280 140,258",mirror:true,dur:2200}],
  "langue-palais":[{t:"hold",pts:[[268,346]]},{t:"marks",pts:[[300,272,"1"],[268,346,"2"]]}],
  "chin-tuck":[{t:"plumb",x:162,y1:226,y2:528},{t:"tuck",y:334}],
  "posture-repos":[{t:"plumb",x:162,y1:226,y2:528},{t:"marks",pts:[[368,250,"1"],[336,292,"2"],[298,272,"3"]]}],
  "gua-sha":[{t:"tool",mirror:true,dur:2000,ds:["M106,302 C118,350 134,400 142,462","M190,388 C160,378 132,352 114,314","M176,300 C156,292 130,278 108,262","M174,244 C160,250 140,248 122,242","M196,132 C172,124 140,130 120,148"]}]
};
for (const id in ANIM){ if (TECH[id]) TECH[id].anim = ANIM[id]; }
TECH["langue-palais"].legend = ["Toute la langue contre le palais","Plancher de la bouche : il se contracte sous le doigt"];
const LYMPH_PTS = [[108,252],[138,364],[130,404],[138,436]];

/* Contenu propre à la nouvelle interface */
const RMETA_UNUSED = {
  matin:{tags:"Drainage · Effleurage", avatar:"pommettes-drain"},
  soir:{tags:"Relâchement · Tenues", avatar:"temporal"},
  tonif:{tags:"Tonification · Exercices", avatar:"joues-lift"},
  profonde:{tags:"Intra-buccal · Gua sha", avatar:"gua-sha"}
};
const DUR = {};
Object.values(ROUTINES).forEach(R => R.steps.forEach(s => { if (!(s.id in DUR)) DUR[s.id] = s.s; }));

/* ---------- Outils ---------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const SVGNS = "http://www.w3.org/2000/svg";
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = matchMedia("(hover: hover)").matches;
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
const I = (d, cls="") => `<svg class="i${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  sliders: I('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
  lock: I('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  minus: I('<path d="M5 12h14"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  bm: I('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>'),
  chev: I('<path d="m6 9 6 6 6-6"/>'),
  chevL: I('<path d="m15 18-6-6 6-6"/>'),
  chevR: I('<path d="m9 18 6-6-6-6"/>'),
  x: I('<path d="M18 6 6 18M6 6l12 12"/>'),
  play: I('<path d="M7 4.8v14.4a1 1 0 0 0 1.52.85l11.5-7.2a1 1 0 0 0 0-1.7L8.52 3.95A1 1 0 0 0 7 4.8z"/>', "pl"),
  pause: I('<rect x="6" y="4.5" width="4" height="15" rx="1.3"/><rect x="14" y="4.5" width="4" height="15" rx="1.3"/>'),
  prev: I('<path d="M19 20 9 12l10-8v16z"/><path d="M5 19V5"/>'),
  next: I('<path d="m5 4 10 8-10 8V4z"/><path d="M19 5v14"/>'),
  check: I('<path d="M20 6 9 17l-5-5"/>'),
  clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  swap: I('<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>'),
  home: I('<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9"/>'),
  grid: I('<rect x="3.5" y="3.5" width="7" height="7" rx="2.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2.2"/>'),
  calendar: I('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>'),
  book: I('<path d="M2.5 5.5h6a3.5 3.5 0 0 1 3.5 3.5v11a2.5 2.5 0 0 0-2.5-2.5h-7z"/><path d="M21.5 5.5h-6A3.5 3.5 0 0 0 12 9v11a2.5 2.5 0 0 1 2.5-2.5h7z"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  filter: I('<path d="M4 6h16M7 12h10M10 18h4"/>'),
  sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>'),
  moon: I('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  flame: I('<path d="M12 21.5c3.9 0 6.5-2.6 6.5-6.2 0-2.9-1.8-5-3.6-6.9 0 1.9-.9 3.2-2.3 3.7.4-3.3-.6-6.3-3.3-8.6 0 3.7-3.8 6-3.8 11.1 0 3.9 2.7 6.9 6.5 6.9z"/>'),
  layers: I('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
  drop: I('<path d="M12 3s6.5 6.7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 9.7 12 3 12 3z"/>'),
  wave: I('<path d="M2.5 12c2-3 4-3 6 0s4 3 6 0 4-3 7 0"/><path d="M2.5 17c2-3 4-3 6 0s4 3 6 0 4-3 7 0" opacity=".5"/><path d="M2.5 7c2-3 4-3 6 0s4 3 6 0 4-3 7 0" opacity=".5"/>'),
  posture: I('<circle cx="12" cy="4.8" r="2.3"/><path d="M12 7.5v7M7.5 10.5h9M9 21l3-6.5 3 6.5"/>'),
  sparkle: I('<path d="M12 3.5l1.9 5.2 5.2 1.9-5.2 1.9L12 17.7l-1.9-5.2-5.2-1.9 5.2-1.9z"/><path d="M19 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'),
  face: I('<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M8.8 14.6c1.8 1.5 4.6 1.5 6.4 0"/>'),
  scale: I('<path d="M12 3.5v17M7 20.5h10M4.5 7.5h15"/><path d="m4.5 7.5-3 6.5a3 3 0 0 0 6 0zM19.5 7.5l-3 6.5a3 3 0 0 0 6 0z"/>'),
  leaf: I('<path d="M5 20c0-8.5 6-15 15.5-15 0 9.5-6.5 15.5-15 15.5"/><path d="M5 20 13.5 11.5"/>'),
  userc: I('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.5-3.8 4.3-5.8 7.5-5.8s6 2 7.5 5.8"/>'),
  shield: I('<path d="M12 3 4.5 6v6c0 4.8 3.3 7.8 7.5 9 4.2-1.2 7.5-4.2 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  file: I('<path d="M6 3h8.5L19 7.5V21H6z"/><path d="M14 3v5h5M9 12.5h6M9 16.5h6"/>'),
  camera: I('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>'),
  note: I('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h3.5"/>'),
  alert: I('<path d="M12 8v5M12 16.5h.01"/><circle cx="12" cy="12" r="9"/>'),
  info: I('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>'),
  repeat: I('<path d="m17 2.5 3.5 3.5L17 9.5"/><path d="M3.5 11.5V10A4 4 0 0 1 7.5 6h13"/><path d="m7 21.5-3.5-3.5L7 14.5"/><path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13"/>'),
  hand: I('<path d="M8 13V5.8a1.6 1.6 0 0 1 3.2 0V11"/><path d="M11.2 10.5V4.3a1.6 1.6 0 0 1 3.2 0v6.2"/><path d="M14.4 10.5V5.8a1.6 1.6 0 0 1 3.2 0V13"/><path d="M17.6 11.2a1.6 1.6 0 0 1 3.2 0V15a6.5 6.5 0 0 1-6.5 6.5h-1.8a6.5 6.5 0 0 1-5.4-2.9L4.3 15a1.6 1.6 0 0 1 2.6-1.8L8 14.6"/>'),
  utensils: I('<path d="M6 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M8 12v9"/><path d="M17.5 21V3c-2 1.5-3 4-3 7 0 2 1 3 3 3"/>'),
  screen: I('<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M8.5 20.5h7M12 16.5v4"/>'),
  apple: I('<path d="M12 7.5c-1.5-1.3-4.8-1.9-6.6.4-1.9 2.4-1.3 6.8.7 9.8 1.4 2.1 3 3.3 4.4 2.6.9-.4 2.1-.4 3 0 1.4.7 3-.5 4.4-2.6 2-3 2.6-7.4.7-9.8-1.8-2.3-5.1-1.7-6.6-.4z"/><path d="M12 7.5c0-2 1-3.8 3-4.5"/>'),
  flask: I('<path d="M9.5 3h5M10 3v6.2L4.8 18.3A1.8 1.8 0 0 0 6.4 21h11.2a1.8 1.8 0 0 0 1.6-2.7L14 9.2V3"/><path d="M7 15h10"/>'),
  news: I('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M7.5 9h9M7.5 12.5h9M7.5 16h5"/>'),
  ext: I('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  eye: I('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  ban: I('<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>'),
  tone: I('<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 7h5M12 11h7.8M12 15h7M12 19h4"/>'),
  snow: I('<path d="M12 2.5v19M4 7l16 10M20 7 4 17"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>'),
  zap: I('<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>'),
  roller: I('<rect x="6" y="3" width="12" height="6" rx="3"/><path d="M12 9v12M9 21h6"/>'),
  cup: I('<path d="M6 10a6 6 0 0 1 12 0v2H6z"/><path d="M8 12v3a4 4 0 0 0 8 0v-3"/>'),
  lines: I('<path d="M4 8.5c5-2.5 11-2.5 16 0"/><path d="M6 13c4-2 8-2 12 0"/><path d="M8.5 17.5c2.5-1.2 4.5-1.2 7 0"/>'),
  ovale: I('<path d="M12 3c-4.2 0-6.8 3.3-6.8 7.8 0 5.2 3.6 10.2 6.8 10.2s6.8-5 6.8-10.2C18.8 6.3 16.2 3 12 3z"/>'),
  tooth: I('<path d="M7.2 3.5C5 3.5 3.5 5.2 3.5 7.6c0 3 1.5 4.4 2 7.4.4 2.6 1 5.5 2.4 5.5 1.7 0 1.7-5 4.1-5s2.4 5 4.1 5c1.4 0 2-2.9 2.4-5.5.5-3 2-4.4 2-7.4 0-2.4-1.5-4.1-3.7-4.1-2 0-3 1-4.8 1s-2.8-1-4.8-1z"/>'),
  chart: I('<path d="M5 20V11"/><path d="M10 20V5"/><path d="M15 20v-7"/><path d="M20 20v-11"/>'),
  up: I('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  quote: I('<path d="M9.5 6.5C6.5 7.5 5 9.8 5 13v4.5h5V13H7.5c0-2 .8-3.5 2.5-4.3M19 6.5c-3 1-4.5 3.3-4.5 6.5v4.5h5V13H17c0-2 .8-3.5 2.5-4.3"/>')
};
const accent = n => { const m = n.match(/^(.*?)\s((?:«\s)?[^\s]+(?:\s»)?)$/); return m ? `${m[1]} <em>${m[2]}</em>` : `<em>${n}</em>`; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmtDur = s => s >= 60 ? (s % 60 ? `${Math.floor(s/60)} min ${s%60}` : `${s/60} min`) : `${s} s`;
const meter = (p, c) => p === 0 ? `<span class="small muted">Sans appui</span>` : `<span class="meter" style="--c:${c||"var(--ink)"}" role="img" aria-label="Pression ${p} sur 4">${[1,2,3,4].map(i => `<i class="${i <= p ? "on" : ""}"></i>`).join("")}</span> <span class="small">${PRESSION[p].nom}</span>`;
const proof = n => `<span class="proof" role="img" aria-label="Niveau de preuve ${n} sur 4">${[1,2,3,4].map(i => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;
const PREUVE_C = [null,"Modèle de praticien","Mécanisme ou anatomie","Observé chez l'humain","Essai randomisé"];
const pv = n => `<span class="pv">${proof(n)}${PREUVE_C[n]}</span>`;
const usedIn = id => Object.entries(ROUTINES).filter(([,R]) => R.steps.some(s => s.id === id)).map(([,R]) => R.nom).join(", ");
const legendHTML = T => T.legend ? `<ul class="legendlist">${T.legend.map((l,i) => `<li><b>${i+1}</b>${l}</li>`).join("")}</ul>` : "";
const img = (src, alt, cls="") => `<img src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async" class="${cls}">`;
document.addEventListener("error", e => {
  const t = e.target;
  if (t.tagName === "IMG" && !t.dataset.failed){ t.dataset.failed = "1"; t.style.visibility = "hidden"; const c = t.closest(".gc, .rc, .lotus, .stagebox"); if (c) c.classList.add("noimg"); }
}, true);

/* ---------- Moteur de tracés ---------- */
const ease = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
function add(parent, tag, attrs={}){ const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
function arrowHead(path, len){
  const a = path.getPointAtLength(len), b = path.getPointAtLength(Math.max(0, len-6));
  let dx = a.x-b.x, dy = a.y-b.y; const m = Math.hypot(dx,dy) || 1; dx/=m; dy/=m; const px=-dy, py=dx; const f = n => n.toFixed(1);
  return `M${f(a.x+dx*4)},${f(a.y+dy*4)} L${f(a.x-dx*7+px*5.5)},${f(a.y-dy*7+py*5.5)} L${f(a.x-dx*7-px*5.5)},${f(a.y-dy*7-py*5.5)} Z`;
}
function parts(gr, s, W){
  if (s.t === "glide" || s.t === "pump"){
    add(gr,"path",{d:s.d,class:"guidebg"});
    return {guide:add(gr,"path",{d:s.d,class:"guide"}), trail:add(gr,"path",{d:s.d,class:"trail"}), start:add(gr,"circle",{r:3.5,class:"startdot"}), arrow:add(gr,"path",{class:"arrow"}), halo:add(gr,"circle",{r:13,class:"halo"}), fing:add(gr,"circle",{r:7,class:"fing"})};
  }
  if (s.t === "hold") return {pts:s.pts.map(([x,y]) => ({ring:add(gr,"circle",{cx:x,cy:y,r:7,class:"ring"}), dot:add(gr,"circle",{cx:x,cy:y,r:6,class:"hdot"})}))};
  if (s.t === "circles") return {pts:s.pts.map(([x,y]) => ({g:add(gr,"circle",{cx:x,cy:y,r:s.r||8,class:"guide"}), fing:add(gr,"circle",{r:5.5,class:"fing"}), x, y}))};
  if (s.t === "pinch"){ const d = "M"+s.pts.map(p=>p.join(",")).join(" L"); add(gr,"path",{d,class:"guidebg"}); return {guide:add(gr,"path",{d,class:"guide"}), a:add(gr,"circle",{r:5,class:"fing"}), b:add(gr,"circle",{r:5,class:"fing"})}; }
  if (s.t === "lift") return {chevs:s.pts.map(([x,y]) => { const cg = add(gr,"g"); add(cg,"path",{d:"M-9,4 L0,-5 L9,4",class:"chev"}); add(cg,"path",{d:"M-9,14 L0,5 L9,14",class:"chev"}); return {cg,x,y}; })};
  if (s.t === "breathe"){ const [x,y] = s.at; const ring = add(gr,"circle",{cx:x,cy:y,r:10,class:"ring"}); const dot = add(gr,"circle",{cx:x,cy:y,r:5,class:"hdot"}); const lbl = add(gr,"text",{x:x+34,y:y+4,class:"lbl"}); lbl.textContent = "inspire 4 s"; return {ring,dot,lbl}; }
  if (s.t === "tool") return {guides:s.ds.map(d => { add(gr,"path",{d,class:"guidebg"}); return add(gr,"path",{d,class:"guide"}); }), arrows:s.ds.map(() => add(gr,"path",{class:"arrow"})), tool:(()=>{const g=add(gr,"g",{class:"tool"}); add(g,"rect",{x:-16,y:-5,width:32,height:10,rx:5}); return g;})()};
  if (s.t === "inside"){ const [x,y] = s.at; add(gr,"circle",{cx:x,cy:y,r:s.r,class:"inside"}); const t = add(gr,"text",{x:x-s.r-6,y:y+4,class:"lbl","text-anchor":"end"}); t.textContent = "dedans"; return {}; }
  if (s.t === "jaw"){ const [x,y] = s.at; const cg = add(gr,"g"); add(cg,"path",{d:"M-8,-10 L0,-17 L8,-10",class:"chev"}); add(cg,"path",{d:"M-8,10 L0,17 L8,10",class:"chev"}); const t = add(gr,"text",{x:x+16,y:y+4,class:"lbl"}); t.textContent = "ouvre et ferme"; return {cg,x,y}; }
  if (s.t === "plumb"){ add(gr,"path",{d:`M${s.x},${s.y1} L${s.x},${s.y2}`,class:"plumb"}); const t = add(gr,"text",{x:s.x+8,y:s.y2-6,class:"lbl"}); t.textContent = "oreille sur épaule"; return {}; }
  if (s.t === "tuck"){ const cg = add(gr,"g"); add(cg,"path",{d:`M372,${s.y} L340,${s.y}`,class:"guidebg"}); add(cg,"path",{d:`M372,${s.y} L340,${s.y}`,class:"guide"}); add(cg,"path",{d:`M332,${s.y} L343,${s.y-6} L343,${s.y+6} Z`,class:"arrow"}); const t = add(gr,"text",{x:376,y:s.y+22,class:"lbl","text-anchor":"end"}); t.textContent = "recule"; return {cg}; }
  if (s.t === "marks"){ s.pts.forEach(([x,y,n]) => { const g = add(gr,"g",{class:"mark"}); add(g,"circle",{cx:x,cy:y,r:10}); const t = add(g,"text",{x,y}); t.textContent = n; }); return {}; }
  return {};
}
function makeTrack(g, s, W){
  const groups = [add(g,"g")];
  if (s.mirror) groups.push(add(g,"g",{transform:`matrix(-1 0 0 1 ${W} 0)`}));
  const refs = groups.map(gr => parts(gr, s, W));
  const tr = {s, refs};
  if (s.t === "glide" || s.t === "pump"){
    const p = refs[0].guide; tr.path = p; tr.len = p.getTotalLength();
    const st = p.getPointAtLength(0), ah = arrowHead(p, tr.len);
    refs.forEach(r => { r.start.setAttribute("cx", st.x); r.start.setAttribute("cy", st.y); r.arrow.setAttribute("d", ah); r.trail.style.strokeDasharray = tr.len; r.trail.style.strokeDashoffset = tr.len; });
  }
  if (s.t === "tool"){ tr.paths = refs[0].guides; tr.lens = tr.paths.map(p => p.getTotalLength()); refs.forEach(r => r.arrows.forEach((a,i) => a.setAttribute("d", arrowHead(tr.paths[i], tr.lens[i])))); }
  if (s.t === "pinch"){ tr.perp = s.pts.map((p,i) => { const a = s.pts[Math.max(0,i-1)], b = s.pts[Math.min(s.pts.length-1,i+1)]; let dx=b[0]-a[0], dy=b[1]-a[1]; const m=Math.hypot(dx,dy)||1; return [-dy/m, dx/m]; }); }
  return tr;
}
const UPD = {
  glide(tr, el){
    const s = tr.s, dur = s.dur||2600, cyc = dur+700, local = el % cyc, p = Math.min(local/dur,1), e = ease(p);
    const pt = tr.path.getPointAtLength(e*tr.len);
    const op = local > dur ? 0 : Math.max(0, Math.min(1, p/.08, (1-p)/.08));
    tr.refs.forEach(r => { r.fing.setAttribute("cx",pt.x); r.fing.setAttribute("cy",pt.y); r.halo.setAttribute("cx",pt.x); r.halo.setAttribute("cy",pt.y); r.fing.style.opacity = op; r.halo.style.opacity = op*.7; r.trail.style.strokeDashoffset = tr.len*(1-e); r.trail.style.opacity = local > dur ? 0 : .45; });
  },
  pump(tr, el){
    const dur = tr.s.dur||1500, p = (el % dur)/dur, e = p < .5 ? ease(p*2) : ease(2-2*p);
    const pt = tr.path.getPointAtLength(e*tr.len);
    tr.refs.forEach(r => { r.fing.setAttribute("cx",pt.x); r.fing.setAttribute("cy",pt.y); r.halo.setAttribute("cx",pt.x); r.halo.setAttribute("cy",pt.y); r.trail.style.strokeDashoffset = tr.len*(1-e); r.trail.style.opacity = .45; });
  },
  hold(tr, el){
    const s = tr.s, n = s.pts.length, idx = s.seq ? Math.floor(el/(s.dur||1800)) % n : -1, q = (el % 1500)/1500;
    tr.refs.forEach(r => r.pts.forEach((pp,i) => { const on = idx < 0 || i === idx; pp.ring.setAttribute("r", (7+14*q).toFixed(1)); pp.ring.style.opacity = on ? .95*(1-q) : 0; pp.dot.style.opacity = on ? 1 : .35; }));
  },
  circles(tr, el){
    const s = tr.s, a = el/(s.dur||1400)*Math.PI*2, r = s.r||8;
    tr.refs.forEach(ref => ref.pts.forEach(pp => { pp.fing.setAttribute("cx", pp.x + r*Math.cos(a)); pp.fing.setAttribute("cy", pp.y + r*Math.sin(a)); }));
  },
  pinch(tr, el){
    const s = tr.s, dur = s.dur||850, n = s.pts.length, idx = Math.floor(el/dur) % n, q = (el % dur)/dur, sep = 11 - 7*Math.sin(Math.PI*q);
    const [x,y] = s.pts[idx], [px,py] = tr.perp[idx];
    tr.refs.forEach(r => { r.a.setAttribute("cx", x+px*sep); r.a.setAttribute("cy", y+py*sep); r.b.setAttribute("cx", x-px*sep); r.b.setAttribute("cy", y-py*sep); });
  },
  lift(tr, el){
    const k = (1 - Math.cos(2*Math.PI*el/(tr.s.dur||2800)))/2;
    tr.refs.forEach(r => r.chevs.forEach(c => { c.cg.setAttribute("transform", `translate(${c.x},${(c.y - 20*k).toFixed(1)})`); c.cg.style.opacity = .3 + .7*k; }));
  },
  breathe(tr, el){
    const t = el % 10000, s = t < 4000 ? ease(t/4000) : 1 - ease((t-4000)/6000);
    tr.refs.forEach(r => { r.ring.setAttribute("r", (9+20*s).toFixed(1)); r.ring.style.opacity = .4 + .6*s; const txt = t < 4000 ? "inspire 4 s" : "expire 6 s"; if (r.lbl.textContent !== txt) r.lbl.textContent = txt; });
  },
  tool(tr, el){
    const s = tr.s, dur = s.dur||2000, per = dur+350, n = s.ds.length, idx = Math.floor(el/per) % n, local = el % per, p = Math.min(local/dur,1), e = ease(p);
    const path = tr.paths[idx], len = tr.lens[idx], pt = path.getPointAtLength(e*len), pt2 = path.getPointAtLength(Math.min(len, e*len+1.5));
    const ang = Math.atan2(pt2.y-pt.y, pt2.x-pt.x)*180/Math.PI + 90;
    const op = local > dur ? 0 : Math.max(0, Math.min(1, p/.08, (1-p)/.08));
    tr.refs.forEach(r => { r.tool.setAttribute("transform", `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)}) rotate(${ang.toFixed(1)})`); r.tool.style.opacity = op; r.guides.forEach((g,i) => g.style.opacity = i === idx ? 1 : .35); });
  },
  jaw(tr, el){
    const k = (1 - Math.cos(2*Math.PI*el/3400))/2;
    tr.refs.forEach(r => r.cg.setAttribute("transform", `translate(${r.x},${r.y}) scale(1,${(0.7 + 0.6*k).toFixed(2)})`));
  },
  tuck(tr, el){
    const t = el % 4200; const k = t < 900 ? ease(t/900) : t < 2600 ? 1 : t < 3500 ? 1 - ease((t-2600)/900) : 0;
    tr.refs.forEach(r => r.cg.setAttribute("transform", `translate(${(-12*k).toFixed(1)},0)`));
  }
};
const INST = new Set();
const io = ("IntersectionObserver" in window) ? new IntersectionObserver(es => es.forEach(e => { const i = e.target.__inst; if (i) i.visible = e.isIntersecting; }), {rootMargin:"80px"}) : null;
function draw(inst, el){ for (const tr of inst.tracks){ const f = UPD[tr.s.t]; if (f) f(tr, el, inst); } }
function unmount(inst){ if (!inst) return; if (io) io.unobserve(inst.svg); INST.delete(inst); }
function mountTrace(container, id, opts={}){
  const old = container.querySelector("svg"); if (old) unmount(old.__inst);
  const T = TECH[id], prof = T.vue === "profil", [W,H] = VB[prof ? "profil" : "face"];
  container.innerHTML = "";
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Tracé du geste : " + T.nom);
  svg.style.setProperty("--c", CATS[T.cat].color);
  const showL = opts.lymph ?? T.lymph;
  const lymph = prof ? "" : `<g class="lymph"${showL ? "" : ' display="none"'}>${LYMPH}</g>`;
  svg.innerHTML = `<image href="${prof ? MEDIA.profile : MEDIA.front}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>${lymph}<g class="tracks"></g>`;
  container.appendChild(svg);
  const inst = {svg, T, t0: performance.now(), visible: true, tracks: []};
  const g = svg.querySelector(".tracks");
  try { inst.tracks = (T.anim||[]).map(s => makeTrack(g, s, W)); } catch(e){ inst.tracks = []; }
  svg.__inst = inst; INST.add(inst); if (io) io.observe(svg);
  draw(inst, 1400);
  return inst;
}
const LYMPH = (() => {
  let s = "";
  LYMPH_PTS.forEach(([x,y]) => { s += `<circle class="node" cx="${x}" cy="${y}" r="5"/><circle class="node" cx="${400-x}" cy="${y}" r="5"/>`; });
  s += `<circle class="node" cx="200" cy="406" r="5"/><circle class="node term" cx="142" cy="466" r="7"/><circle class="node term" cx="258" cy="466" r="7"/>`;
  return s;
})();
function loop(now){ for (const inst of INST){ if (inst.visible) draw(inst, Math.max(0, now - inst.t0) + 1400); } requestAnimationFrame(loop); }
if (!reduceMotion) requestAnimationFrame(loop);

function mountMap(container){
  if (!HAVE.front){ const b = container.closest(".mapbox") || container; b.hidden = true; return; }
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 60 400 460"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Voies de drainage lymphatique du visage");
  svg.style.setProperty("--c", "var(--drain)");
  svg.innerHTML = `<image href="${MEDIA.front}" x="0" y="0" width="400" height="600"/><g>${LYMPH}</g><g class="tracks"></g>`;
  container.appendChild(svg);
  const g = svg.querySelector(".tracks");
  ["cou-lateral","menton-dessous","machoire-drain","pommettes-drain","yeux-drain","front-drain"].forEach(id => {
    const d = ANIM[id][0].d;
    [add(g,"g"), add(g,"g",{transform:"matrix(-1 0 0 1 400 0)"})].forEach(gr => { add(gr,"path",{d,class:"guidebg"}); const p = add(gr,"path",{d,class:"guide"}); add(gr,"path",{d:arrowHead(p, p.getTotalLength()),class:"arrow"}); });
  });
  [["A",300,244],["B",268,360],["C",210,426],["D",280,442],["E",270,488]].forEach(([t,x,y]) => { const e = add(g,"text",{x,y,class:"nodelbl"}); e.textContent = t; });
}

/* ---------- Dates, programme ---------- */
const mid = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate()+n);
const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parseKey = k => { const [y,m,d] = k.split("-").map(Number); return new Date(y, m-1, d); };
function weekOf(d){ const s = store.get("pv-start", null); if (!s) return null; const days = Math.round((mid(d) - parseKey(s))/864e5); return Math.floor(days/7) + 1; }
function planFor(d){
  const dow = d.getDay(); let p = [...WEEK[dow]]; let w = weekOf(d);
  if (w === null || w < 1) w = 1;
  if (w >= 1){
    if (w <= 2) p = p.filter(r => r !== "tonif").map(r => r === "profonde" || r === "lisser" ? "soir" : r);
    else if ((w <= 6 || w > 12) && dow === 4) p = p.map(r => r === "profonde" ? "soir" : r);
  }
  if (w >= 3 && goals().includes("sillons")) p = p.map(r => r === "tonif" ? "sillon" : r);
  return p;
}
function isDone(k, r){ return (store.get("pv-done", {})[k] || []).includes(r); }
function markDone(r){ const all = store.get("pv-done", {}); const k = key(new Date()); all[k] = [...new Set([...(all[k]||[]), r])]; store.set("pv-done", all); }
const mins = r => Math.round(ROUTINES[r].steps.reduce((a,s) => a + s.s, 0)/60);
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const fmtLong = d => cap1(new Intl.DateTimeFormat("fr-FR", {weekday:"long", day:"numeric", month:"long"}).format(d));
const fmtChip = d => cap1(new Intl.DateTimeFormat("fr-FR", {weekday:"long", day:"numeric"}).format(d)) + " " + new Intl.DateTimeFormat("fr-FR", {month:"short"}).format(d);
const fmtShort = d => new Intl.DateTimeFormat("fr-FR", {weekday:"long", day:"numeric"}).format(d);
const favs = () => store.get("pv-fav", []);
const goals = () => store.get("pv-goals", []);
function syncFavN(){ const n = favs().length, e = $("#favN"); if (e){ e.textContent = n || ""; e.dataset.n = n; } }
function toggleFav(id){ const f = favs(); const i = f.indexOf(id); if (i >= 0) f.splice(i,1); else f.push(id); store.set("pv-fav", f); return f.includes(id); }

/* ---------- Aujourd'hui ---------- */
let SEL = mid(new Date());
const RICON = {matin:"sun", soir:"moon", tonif:"flame", profonde:"layers", lisser:"lines", sillon:"face"};
const CICON = {drainage:"drop", relachement:"wave", tonif:"flame", posture:"posture", outil:"sparkle"};
/* Teintes des cartes de routine (photo lavée de couleur) */
const RTINT = {matin:"#6C93D6", soir:"#C9739E", tonif:"#DC8E5A", profonde:"#6564B0", lisser:"#7D9E62", sillon:"#B7795E"};
/* Phrase courte affichée dans le programme du jour */
const RMSG = {matin:"Au réveil, avant le café.", soir:"Tenues, puis lissages à l'huile.", tonif:"Devant un miroir, front détendu.", profonde:"Intra-buccal, puis gua sha.", lisser:"Bas du visage d'abord, puis le front.", sillon:"Cou, coins de la bouche, puis sillon au gant."};
const PHASES = [
  {w:"Semaines 1 à 2", n:"Apprendre", t:"Matin et soir seulement, pression 1 à 3. Repère tes muscles et ton côté tendu. Photos du jour 0."},
  {w:"Semaines 3 à 6", n:"Charger", t:"Ajoute Tonifier lundi, mercredi et vendredi, Lisser mardi et samedi, et la séance profonde le dimanche."},
  {w:"Semaines 7 à 12", n:"Consolider", t:"Séance profonde jeudi et dimanche, tenues plus longues du côté tendu. Photos aux semaines 4, 8 et 12."}
];
const phOf = i => i < 2 ? 0 : i < 6 ? 1 : 2;
function progState(today){
  const s = store.get("pv-start", null), w = weekOf(today);
  const started = !!s && w >= 1, over = started && w > 12, ph = started ? phOf(Math.min(w, 12) - 1) : -1;
  return {s, w, started, over, ph};
}
const MOIS = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const calHTML = (m, b, d) => `<span class="cal" aria-hidden="true"><span class="m">${m}</span><b>${b}</b><span class="d">${d}</span></span>`;
const planMin = d => planFor(d).reduce((a,r) => a + mins(r), 0);
const f2 = n => +n.toFixed(2);
/* Courbe lissée (Catmull-Rom convertie en Bézier) */
function smooth(pts){
  let d = `M${f2(pts[0][0])},${f2(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++){
    const p0 = pts[i-1] || pts[i], p1 = pts[i], p2 = pts[i+1], p3 = pts[i+2] || p2;
    const c1 = [p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6], c2 = [p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6];
    d += ` C${f2(c1[0])},${f2(c1[1])} ${f2(c2[0])},${f2(c2[1])} ${f2(p2[0])},${f2(p2[1])}`;
  }
  return d;
}
const doneOn = k => (store.get("pv-done", {})[k] || []).filter(r => ROUTINES[r]);
function dayStat(d){
  const k = key(d), plan = planFor(d), pm = plan.reduce((a,r) => a + mins(r), 0), done = doneOn(k);
  const dm = done.reduce((a,r) => a + mins(r), 0), dn = plan.filter(r => done.includes(r)).length;
  return {d, k, plan, pm, dm, dn, done, full: plan.length > 0 && dn === plan.length};
}
/* Jauge en demi-cercle : segments en forme de pilule */
function gaugeSVG(n, cls, id){
  let s = "";
  for (let i = 0; i < n; i++){ const a = 180 + i * 180 / (n - 1);
    s += `<rect class="s ${cls(i)}" x="-21" y="-5.5" width="42" height="11" rx="5.5" transform="translate(150 158) rotate(${a.toFixed(2)}) translate(118 0)"/>`; }
  return `<svg class="gauge"${id ? ` id="${id}"` : ""} viewBox="0 0 300 172" aria-hidden="true">${s}</svg>`;
}
function renderGauge(mon, today){
  const st = Array.from({length:7}, (_,i) => dayStat(addDays(mon, i))), tk = key(today);
  const totP = st.reduce((a,s) => a + s.pm, 0) || 1, totD = st.reduce((a,s) => a + s.dm, 0);
  const td = st.find(s => s.k === tk), rest = td ? td.plan.filter(r => !td.done.includes(r)).reduce((a,r) => a + mins(r), 0) : 0;
  const N = 23, dS = Math.min(N, Math.round(N * totD / totP)), tS = Math.min(N, Math.round(N * (totD + rest) / totP));
  const pct = Math.min(100, Math.round(100 * totD / totP)), cur = !!td;
  const lbl = cur ? "Cette semaine" : "Semaine du " + new Intl.DateTimeFormat("fr-FR", {day:"numeric", month:"short"}).format(mon);
  $("#gauge").innerHTML = `<div class="gauge-w" role="img" aria-label="${pct} % des minutes de la semaine faites, ${totD} sur ${totP} minutes">${gaugeSVG(N, i => i < dS ? "d" : i < tS ? "t" : "")}<div class="gauge-c"><span>${lbl}</span><b>${pct} %</b></div></div><p class="gauge-m">${totD} sur ${totP} min${rest ? `<i>${rest} min aujourd'hui</i>` : ""}</p>`;
}
function agendaRow(r, done){
  const R = ROUTINES[r];
  return `<button class="glrow${done ? " done" : ""}" data-run="${r}" style="--c:${RTINT[r]}"><span class="av">${img(MEDIA.cover(r), "")}</span><span class="tx"><b>${R.nom}</b><span>${done ? "Faite" : mins(r) + " min"}</span></span><span class="st">${done ? ICON.check : ICON.chevR}</span></button>`;
}
function renderAgenda(){
  const today = mid(new Date()), sk = key(SEL), isToday = sk === key(today), plan = planFor(SEL);
  const next = isToday ? plan.find(r => !isDone(sk, r)) : null;
  const rows = plan.filter(r => r !== next).map(r => agendaRow(r, isDone(sk, r))).join("");
  const N = next && ROUTINES[next];
  const big = next ? `<article class="pnext" style="--c:${RTINT[next]}">${img(MEDIA.cover(next), "")}<div class="pn-b"><b>${N.nom}</b><span>${mins(next)} min, ${N.steps.length} gestes</span></div><span class="pn-go" aria-hidden="true">${ICON.play}Lancer</span><button class="stretch" data-run="${next}" aria-label="Lancer ${N.nom}, ${mins(next)} minutes"></button></article>`
    : isToday && plan.length ? `<div class="pdone"><span class="ok">${ICON.check}</span><div><b>Tout est fait</b><span>À demain matin.</span></div></div>` : "";
  $("#rplan").innerHTML = big + (rows ? `<div class="list prows">${rows}</div>` : "");
}
function streak(today){
  const all = store.get("pv-done", {}), has = d => (all[key(d)] || []).length > 0;
  const t = has(today); let d = t ? today : addDays(today, -1), n = 0;
  while (has(d) && n < 500){ n++; d = addDays(d, -1); }
  return {n, today: t};
}
function renderWidgets(today){
  const st = streak(today), all = store.get("pv-done", {});
  const dots = Array.from({length:12}, (_,i) => { const d = addDays(today, i - 11), on = (all[key(d)] || []).length > 0; return `<i class="${on ? (i === 11 ? "now" : "on") : ""}"></i>`; }).join("");
  const ph = photoNext(today), s = store.get("pv-start", null), n = s ? Math.round((today - parseKey(s)) / 864e5) : -1;
  const cps = [0, 28, 56, 84], xs = [6, 30, 54, 78], prog = n < 0 ? 0 : Math.min(84, n) / 84;
  const tl = `<svg class="tl4" viewBox="0 0 84 40" aria-hidden="true"><path class="ln" d="M6 26 H78"/><path class="lf" d="M6 26 H${(6 + 72 * prog).toFixed(1)}"/>${cps.map((c,i) => `<circle cx="${xs[i]}" cy="26" r="4.5" class="${n >= c ? "on" : ""}"/>`).join("")}</svg>`;
  $("#widgets").innerHTML = `<div class="wdg"><span class="wi">${ICON.flame}</span><span class="wd">${st.today ? "+1 aujourd'hui" : "12 derniers jours"}</span><span class="wz"><span class="dots14" aria-hidden="true">${dots}</span></span><span class="wv">${st.n}<small> j</small><span class="wl">Série</span></span></div>
    <button class="wdg" data-tab="photos"><span class="wi">${ICON.camera}</span><span class="wd">${ph.d.replace(/<[^>]+>/g, "")}</span><span class="wz">${tl}</span><span class="wv">${ph.v.replace(/jours?</, "j<")}<span class="wl">Photos</span></span></button>`;
}
function renderTracks(today){
  const days = Array.from({length:14}, (_,i) => dayStat(addDays(today, i - 13)));
  const tot = days.reduce((a,s) => a + s.dm, 0), mx = Math.max(...days.map(s => s.dm), 1), imx = days.findIndex(s => s.dm === mx);
  const bars1 = days.map((s,i) => `<i class="${s.dm ? "" : "z"}" style="height:${Math.max(3, s.dm / mx * 100)}%">${i === imx && s.dm ? `<em>${s.dm}m</em>` : ""}</i>`).join("");
  const mon = addDays(today, -((today.getDay()+6) % 7));
  const weeks = Array.from({length:8}, (_,w) => { const m = addDays(mon, (w - 7) * 7); let p = 0, d = 0;
    for (let i = 0; i < 7; i++){ const day = addDays(m, i); if (day > today) break; const s = dayStat(day); d += s.dn; p += key(day) === key(today) ? s.dn : s.plan.length; }
    return p ? Math.round(100 * d / p) : 0; });
  const wmx = Math.max(...weeks, 1), iw = weeks.lastIndexOf(wmx), cur = weeks[7];
  const bars2 = weeks.map((v,i) => `<i class="${v ? "" : "z"}" style="height:${Math.max(3, v / Math.max(wmx, 1) * 100)}%">${i === iw && v ? `<em>${v} %</em>` : ""}</i>`).join("");
  $("#trk").innerHTML = `<div class="trc"><div class="tv">${tot}<small>min</small></div><div class="tk">14 derniers jours</div>${tot ? `<div class="bars" aria-hidden="true">${bars1}</div>` : `<p class="tempty">Tes minutes s'afficheront ici après ta première routine.</p>`}<div class="foot">Minutes par jour</div></div>
    <div class="trc pink"><div class="tv">${cur}<small>%</small></div><div class="tk">Routines faites</div>${weeks.some(v => v) ? `<div class="bars" aria-hidden="true">${bars2}</div>` : `<p class="tempty">La part de routines faites, semaine après semaine.</p>`}<div class="foot">8 semaines</div></div>`;
}
function rcard(r, done){
  const R = ROUTINES[r];
  return `<button class="rcard${done ? " is-done" : ""}" data-run="${r}" style="--c:${RTINT[r] || "#6564B0"}" aria-label="Lancer ${R.nom}, ${mins(r)} minutes">${img(MEDIA.cover(r), "")}<span class="rc-x"><b>${R.nom}</b><span>${done ? `${ICON.check}Faite` : `${mins(r)} min`}</span></span></button>`;
}
function renderHero(today){
  const el = $("#hero"); if (!el) return;
  const {s, w, started, over, ph} = progState(today);
  let k, t, p, extra = "";
  if (!s){ k = "12 semaines"; t = "Douze semaines pour ton visage"; p = "Choisis ton jour de départ et le calendrier suit les trois phases."; extra = `<button class="wbtn" data-start>Commencer aujourd'hui</button>`; }
  else if (!started){ k = "Bientôt"; t = "Départ programmé"; p = `Ton programme commence ${fmtShort(parseKey(s))}. D'ici là, les routines douces du début.`; }
  else if (over){ k = "Après 12 semaines"; t = "Entretien"; p = "Matin et soir, séance profonde le dimanche. Refais tes photos et compare-les au jour 0."; }
  else { k = `Semaine ${w} sur 12`; t = PHASES[ph].n; p = PHASES[ph].t;
    extra = `<div class="bar" aria-hidden="true">${Array.from({length:12}, (_,i) => `<i class="${i+1 < w ? "done" : i+1 === w ? "now" : ""}"></i>`).join("")}</div>`; }
  el.innerHTML = `<article class="lotus prog"><img class="bgimg brand" src="media/brand/field-night.webp" alt=""><span class="lk">${k}</span><h3>${t}</h3><p>${p}</p>${extra}</article>`;
}
/* Points photo du protocole : jour 0 puis fin des semaines 4, 8 et 12 */
function photoNext(today){
  const {st, n, next, ss} = phPlan();
  if (!st) return ss.length ? {v:`${ss.length}`, d:ss.length > 1 ? "séances faites" : "séance faite", cls:"grey"} : {v:"Jour 0", d:"au démarrage", cls:"grey"};
  if (n < 0) return {v:`${-n} <small>jour${-n > 1 ? "s" : ""}</small>`, d:"avant le jour 0", cls:"grey"};
  if (!next) return {v:"Terminé", d:"compare au jour 0", cls:"green"};
  if (!ss.length && n > 3) return {v:"À faire", d:"photos de référence", cls:"green"};
  const dd = next.c - n, lab = next.c ? `semaine ${next.c / 7}` : "jour 0";
  if (dd === 0) return {v:"Aujourd'hui", d:lab, cls:"green"};
  if (dd < 0) return {v:"À faire", d:lab, cls:"green"};
  return {v:`${dd} <small>jour${dd > 1 ? "s" : ""}</small>`, d:lab, cls:""};
}
function renderToday(){
  const today = mid(new Date()), sk = key(SEL), isToday = sk === key(today);
  $("#todayDate").textContent = fmtChip(SEL);
  const dc = $(".daychip"); if (dc) dc.classList.toggle("other", !isToday);
  const di = $("#dayIn"); if (di) di.value = sk;
  const plan = planFor(SEL), tot = plan.reduce((a,r) => a + mins(r), 0), {started, over, w} = progState(today);
  $("#dayTitle").textContent = isToday ? "Au programme" : fmtShort(SEL).replace(/^./, c => c.toUpperCase());
  $("#dayHint").innerHTML = !isToday ? `<button class="more" data-today>Aujourd'hui${ICON.chevR}</button>` : started ? (over ? "Entretien" : `Semaine ${w} sur 12`) : `${tot} min`;
  renderAgenda();
  $("#rother").innerHTML = Object.keys(ROUTINES).filter(r => !plan.includes(r)).map(r => rcard(r, isDone(sk, r))).join("");
  bilNudge();
  renderHero(today); renderTip();
  syncFavN();
}

/* ---------- Programme ---------- */
function renderProgram(){
  if (!$("#program")) return;
  const today = mid(new Date()), {s, w, started, over, ph} = progState(today);
  const bar = `<div class="tl-bar${started ? " started" : ""}" aria-hidden="true">${Array.from({length:12}, (_,i) => `<i class="p${phOf(i)}${started && i+1 < w ? " done" : ""}${started && !over && i+1 === w ? " now" : ""}"></i>`).join("")}</div><div class="tl-legend"><span>Semaine 1</span><span>6</span><span>12</span></div>`;
  let title, sub, ctl, cal;
  if (!s){ title = "Pas encore commencé"; sub = "Sans date, l'app te propose les routines douces des deux premières semaines."; cal = calHTML(MOIS[today.getMonth()], today.getDate(), DOW[today.getDay()]);
    ctl = `<button class="btn" data-start>Commencer aujourd'hui</button><input type="date" class="datein" id="startDate" aria-label="Choisir une autre date de départ">`; }
  else { const sd = parseKey(s);
    title = !started ? `Départ ${fmtShort(sd)}` : over ? "Programme terminé" : `Semaine ${w} sur 12`;
    sub = !started ? "D'ici là, l'app te propose les routines douces du début." : over ? "Entretien : matin et soir, séance profonde le dimanche." : `Phase ${ph+1} : ${PHASES[ph].n.toLowerCase()}.`;
    cal = started ? calHTML("Sem.", String(Math.min(w, 12)).padStart(2, "0"), over ? "finie" : "sur 12") : calHTML(MOIS[sd.getMonth()], sd.getDate(), DOW[sd.getDay()]);
    ctl = `<span class="lbl">Départ le</span><input type="date" class="datein" id="startDate" value="${s}" aria-label="Date de départ"><button class="btn sec sm" data-reset>Effacer</button>`; }
  $("#program").innerHTML = `<div class="box pcard2"><div class="row1">${cal}<div><b>${title}</b><span>${sub}</span></div></div>${bar}<div class="progctl">${ctl}</div></div>`;
  $("#progBanner").innerHTML = bannerHTML("glow:jade", "La régularité compte <span>plus que l'intensité.</span>", "Les essais mesurent des effets après 8 à 12 semaines de pratique régulière.");
  $("#phases").innerHTML = PHASES.map((p,i) => `<div class="tl-item${started && !over && i === ph ? " cur" : ""}"><div class="box"><span class="ph">${i+1}</span><div class="w">${p.w}</div><div class="n">${p.n}</div><p>${p.t}</p></div></div>`).join("");
  renderHeat(today); renderByRoutine(today); renderBilan();
  const order = [1,2,3,4,5,6,0], fmtDay = new Intl.DateTimeFormat("fr-FR", {weekday:"long"});
  $("#weekplan").innerHTML = order.map(dw => { const d = addDays(mon0(), (dw + 6) % 7);
    return `<div class="li plain"><div class="tx"><b>${cap1(fmtDay.format(d))}</b><div class="chipset">${wk3(dw).map(r => `<span class="rchip" style="--c:${RTINT[r]}">${ICON[RICON[r]]}${ROUTINES[r].nom}</span>`).join("")}</div></div><span class="wk-min">${wk3(dw).reduce((a,r) => a + mins(r), 0)} min</span></div>`; }).join("");
}
function renderHeat(today){
  const s = store.get("pv-start", null), t0 = s ? parseKey(s) : addDays(today, -83);
  const m0 = addDays(t0, -((t0.getDay()+6) % 7)), cells = [];
  let full = 0, part = 0;
  for (let i = 0; i < 84; i++){ const d = addDays(m0, i), k = key(d);
    if (d > today){ cells.push(`<i class="f"></i>`); continue; }
    const st = dayStat(d), n = st.done.length, c = st.full ? "c2" : n ? "c1" : "";
    if (st.full) full++; else if (n) part++;
    cells.push(`<i class="${c}${k === key(today) ? " now" : ""}" title="${fmtShort(d)}">${n || ""}</i>`); }
  $("#heat").innerHTML = `<div class="heat"><div class="hgrid" role="img" aria-label="${full} jours complets et ${part} jours entamés sur 12 semaines">${cells.join("")}</div>
    <h3>Douze semaines, jour après jour</h3><p>Une colonne par semaine, une case par jour. Le chiffre compte les routines faites ce jour-là.${full + part ? "" : " Ta première routine colorera la première case."}</p>
    <div class="hleg"><span><i style="background:var(--orange)"></i>Complet, ${full}</span><span><i style="background:#F7C4EA"></i>Entamé, ${part}</span><span><i style="background:var(--cream)"></i>Rien</span></div></div>`;
}
function renderByRoutine(today){
  const mon = addDays(today, -((today.getDay()+6) % 7)), cnt = {}, w = weekOf(today);
  for (let i = 0; i < 7; i++){ const d = addDays(mon, i), st = dayStat(d);
    st.plan.forEach(r => { cnt[r] = cnt[r] || {p:0, d:0}; cnt[r].p++; if (st.done.includes(r)) cnt[r].d++; }); }
  const cols = ["var(--pink)", "var(--orange)"];
  const rows = Object.keys(ROUTINES).filter(r => cnt[r]).map((r,i) => { const c = cnt[r], pct = Math.round(100 * c.d / c.p);
    return `<div><div class="pl-l"><span>${ROUTINES[r].nom}</span><span>${c.d} sur ${c.p}</span></div><div class="pl-w" style="--c:${cols[i % 2]}"><div class="pl"><i style="width:calc(${Math.max(pct, 4)}% - 6px)"></i></div><em>${pct} %</em></div></div>`; }).join("");
  const bits = Array.from({length:7}, (_,i) => { const d = addDays(mon, i); if (d > today) return `<i class="f">${cap1(DOW[d.getDay()]).charAt(0)}</i>`; const st = dayStat(d); return `<i class="${st.full ? "c2" : st.done.length ? "c1" : ""}">${st.done.length || cap1(DOW[d.getDay()]).charAt(0)}</i>`; }).join("");
  $("#byRoutine").innerHTML = `<div class="olive"><div class="ok">${w && w >= 1 ? `Semaine ${Math.min(w, 12)}` : "Cette semaine"}</div><h3>Tes routines, une par une</h3><div class="pills">${rows}</div><div class="bits" aria-hidden="true">${bits}</div></div>`;
}
const wk3 = dw => goals().includes("sillons") ? WEEK[dw].map(r => r === "tonif" ? "sillon" : r) : WEEK[dw];
const mon0 = () => { const t = mid(new Date()); return addDays(t, -((t.getDay()+6) % 7)); };

/* ---------- Gestes ---------- */
const F = {view:"all", goals:[], cats:[], p:[], pr:[], q:""};
/* Objectifs affichés en pastilles : chacun regroupe plusieurs cibles */
const GOALS = {
  rides:{nom:"Rides", ic:"lines", c:"var(--release)", cib:Object.keys(CIBLES).filter(k => CIBLES[k].ride || k === "rides")},
  gonflement:{nom:"Gonflement", ic:"drop", c:"var(--drain)", cib:["gonflement","cernes"]},
  ovale:{nom:"Ovale", ic:"ovale", c:"var(--tone)", cib:["ovale","doublementon","menton"]},
  machoire:{nom:"Mâchoire", ic:"tooth", c:"var(--posture)", cib:["machoire","tension"]},
  posture:{nom:"Posture", ic:"posture", c:"var(--tool)", cib:["posture","symetrie"]}
};
const norm = s => String(s || "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’'`]/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const STOP = new Set("de du des la le les l d et a au aux un une pour sur en par avec mon ma mes ton ta tes je j".split(" "));
const qwords = q => norm(q).split(" ").filter(w => w && !STOP.has(w)).map(w => w.length > 4 ? w.replace(/[sx]$/, "") : w);
/* Index de recherche : nom, muscles, catégorie, cibles et leurs synonymes, puis le texte de la fiche */
const HAY = {};
for (const id in TECH){ const T = TECH[id], cib = T.cibles || [];
  const cw = c => CIBLES[c].nom + " " + CIBLES[c].mots + (CIBLES[c].ride ? " rides ride" : "");
  HAY[id] = {name: norm(T.nom).split(" "), first: norm(cib.slice(0, 1).map(cw).join(" ")).split(" "), other: norm(cib.slice(1).map(cw).join(" ")).split(" "),
    weak: norm([T.latin, CATS[T.cat].nom, T.pourquoi, T.etapes.join(" "), T.dose].join(" ")).split(" "), nride: cib.filter(c => CIBLES[c].ride).length};
}
const hit = (words, w) => words.some(x => w.length <= 3 ? x === w : x.startsWith(w));
function score(id, ws){
  const H = HAY[id]; let s = 0;
  for (const w of ws){ const n = hit(H.name, w) ? 8 : hit(H.first, w) ? 5 : hit(H.other, w) ? 2 : hit(H.weak, w) ? 1 : 0; if (!n) return 0; s += n; }
  return s + H.nride * .1;
}
const ROUTINE_CIB = {matin:["gonflement","cernes"], soir:["machoire","tension","sillons","glabelle"], tonif:["ovale","sillons","doublementon"], profonde:["ovale","machoire","sillons"], lisser:["rides","sillons","amertume","levres","front","pattesoie","cou","menton"], sillon:["sillons","amertume","ovale"]};
function routineFor(ws){
  if (!ws.length) return null;
  let best = null, bs = 0;
  for (const r in ROUTINE_CIB){ const words = norm(ROUTINES[r].nom + " " + ROUTINE_CIB[r].map(c => CIBLES[c].nom + " " + CIBLES[c].mots + (CIBLES[c].ride ? " rides" : "")).join(" ")).split(" ");
    if (!ws.every(w => hit(words, w))) continue;
    const s = ROUTINE_CIB[r].length + (r === "lisser" && ws.some(w => w.startsWith("ride")) ? 10 : 0) + (r === "sillon" && ws.some(w => /^(sillon|nasog|amertume|commiss|coin|marionn)/.test(w)) ? 12 : 0); if (s > bs){ bs = s; best = r; } }
  return best;
}
function renderLegends(){
  $("#legPression").innerHTML = [1,2,3,4].map(p => `<div><dt>${meter(p).replace(/<span class="small">.*<\/span>/, "")}</dt><dd><b>${PRESSION[p].nom}.</b> ${PRESSION[p].txt}</dd></div>`).join("");
  $("#legPreuve").innerHTML = [4,3,2,1].map(n => `<div><dt>${proof(n)}</dt><dd><b>${PREUVE_C[n]}.</b> ${PREUVE[n]}</dd></div>`).join("");
}
function filtered(){
  const ws = qwords(F.q), fv = favs();
  const ids = Object.keys(TECH).filter(id => {
    const T = TECH[id];
    if (F.view === "fav" && !fv.includes(id)) return false;
    if (F.goals.length && !F.goals.some(g => GOALS[g].cib.some(c => (T.cibles || []).includes(c)))) return false;
    if (F.cats.length && !F.cats.includes(T.cat)) return false;
    if (F.p.length && !F.p.includes(T.p)) return false;
    if (F.pr.length && !F.pr.includes(T.preuve[0])) return false;
    if (ws.length && !score(id, ws)) return false;
    return true;
  });
  if (ws.length) ids.sort((a,b) => score(b, ws) - score(a, ws));
  else if (F.goals.length){ const g = id => { const c = TECH[id].cibles || []; return (F.goals.some(k => GOALS[k].cib.includes(c[0])) ? 2 : 1) + HAY[id].nride * .1; }; ids.sort((a,b) => g(b) - g(a)); }
  return ids;
}
function gcard(id){
  const T = TECH[id], fav = favs().includes(id), c = CATS[T.cat];
  return `<article class="gc" style="--c:${c.color}" data-hover="${id}"><div class="media">${img(MEDIA.g(id), T.nom)}</div>
    <button class="bm" data-fav="${id}" aria-pressed="${fav}" aria-label="${fav ? "Retirer de ma pratique" : "Ajouter à ma pratique"}">${ICON.bm}</button>
    <div class="gc-b"><div class="gc-t">${T.nom}</div><div class="gc-s">${fmtDur(DUR[id] || 60)}</div></div>
    <button class="stretch" data-fiche="${id}" aria-label="Ouvrir la fiche : ${esc(T.nom)}"></button>
  </article>`;
}
function renderChips(){
  const fv = favs().length, nf = F.cats.length + F.p.length + F.pr.length;
  const chip = (k, label, pressed, icon, c, n) => `<button class="chip${icon ? "" : " noic"}" data-chip="${k}" aria-pressed="${pressed}"${c ? ` style="--c:${c}"` : ""}>${icon ? ICON[icon] : ""}${label}${n != null ? ` <span class="n">${n}</span>` : ""}</button>`;
  $("#chips").innerHTML = chip("all", "Tous", F.view === "all" && !F.goals.length, null) + chip("fav", "Ma pratique", F.view === "fav", "bm", null, fv)
    + Object.entries(GOALS).map(([g,v]) => chip("goal:" + g, v.nom, F.goals.includes(g), v.ic, v.c)).join("")
    + chip("filters", "Filtres", nf > 0 || !$("#pop").hidden, "filter", null, nf || null);
}
const SUGG = ["rides", "bouche tombante", "sillons", "cernes", "double menton", "mâchoire serrée"];
function renderGestes(){
  const ids = filtered(), ws = qwords(F.q);
  syncFavN(); renderChips();
  const qc = $("#qclear"); if (qc) qc.hidden = !F.q;
  const pn = $("#popN"); if (pn) pn.textContent = ids.length ? `Voir ${ids.length} geste${ids.length > 1 ? "s" : ""}` : "Aucun résultat";
  const r = routineFor(ws) || (!ws.length && F.goals.length === 1 && F.goals[0] === "rides" ? "lisser" : null);
  const rs = r && ids.length ? `<button class="rsugg" data-run="${r}" style="--c:${RTINT[r]}"><span class="ic">${ICON[RICON[r]]}</span><span class="tx"><b>Routine ${ROUTINES[r].nom}</b><span>${ROUTINES[r].steps.length} gestes enchaînés, ${mins(r)} min</span></span><span class="go">${ICON.play}</span></button>` : "";
  const res = ws.length && ids.length ? `<p class="rescount">${ids.length} geste${ids.length > 1 ? "s" : ""} pour « ${esc(F.q.trim())} »</p>` : "";
  const sugg = `<div class="sugg">${SUGG.map(s => `<button data-q="${s}">${ICON.search}${s}</button>`).join("")}</div>`;
  const egg = ws.some(w => /^(chat|miaou|ronron|defroiss|minou|matou)/.test(w));
  const ec = egg ? `<button class="catcard" data-catshow><span class="ci" aria-hidden="true"></span><span class="tx"><b>Le pétrissage du chat</b><span>Pattes de velours, deux minutes. Preuve : ronron.</span></span><span class="go">${ICON.play}</span></button>` : "";
  $("#tgrid").innerHTML = ec + res + rs + (ids.length ? ids.map(gcard).join("") : egg ? ""
    : F.view === "fav" && !ws.length ? `<div class="empty"><span class="ic">${ICON.bm}</span><b>Ta pratique est vide</b>Touche le signet d'une photo pour garder le geste ici.</div>`
    : `<div class="empty"><span class="ic">${ICON.search}</span><b>${ws.length ? `Rien pour « ${esc(F.q.trim())} »` : "Aucun geste"}</b>${ws.length ? "Essaie un de ces mots :" : "Aucun geste ne correspond à ces filtres."}${ws.length ? sugg : ""}</div>`);
  const act = [...F.cats.map(c => ["cat", c, CATS[c].nom]), ...F.p.map(p => ["p", p, p === 0 ? "Sans appui" : PRESSION[p].nom]), ...F.pr.map(n => ["pr", n, PREUVE_C[n]])];
  $("#active").innerHTML = act.map(([k,v,l]) => `<button class="chipx" data-rm="${k}:${v}" aria-label="Retirer le filtre ${esc(l)}">${l}${ICON.x}</button>`).join("");
}
function openPop(){
  const pop = $("#pop");
  if (!pop.hidden){ closePop(); return; }
  pop.hidden = false;
  const grp = (k, opts) => `<div class="opts">${opts.map(([v,l]) => `<button class="opt" data-opt="${k}:${v}" aria-pressed="${k === "cats" ? F.cats.includes(v) : F[k].includes(+v)}">${l}</button>`).join("")}</div>`;
  pop.innerHTML = `<h3>Technique</h3>${grp("cats", Object.entries(CATS).map(([c,v]) => [c, v.nom]))}<h3>Pression</h3>${grp("p", [0,1,2,3,4].map(n => [n, n === 0 ? "Sans appui" : PRESSION[n].nom]))}<div class="foot"><button class="linkbtn" data-clear>Tout effacer</button><button class="btn sm" data-closepop id="popN"></button></div>`;
  renderGestes();
}
function closePop(){ const pop = $("#pop"); if (!pop) return; pop.hidden = true; if (!$("#p-gestes").hidden) renderChips(); }
function hoverOn(card){
  if (!canHover || reduceMotion) return;
  const id = card.dataset.hover, m = card.querySelector(".media");
  if (!m || m.querySelector("video")) return;
  const v = document.createElement("video"); v.src = MEDIA.v(id); v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.setAttribute("aria-hidden", "true");
  v.addEventListener("error", () => v.remove());
  m.appendChild(v); v.play().catch(() => {});
}
function hoverOff(card){ const v = card.querySelector(".media video"); if (v){ v.pause(); v.remove(); } }

/* ---------- Fiche et lecteur ---------- */
const OV = $("#ov"), OVIN = $("#ovIn");
let OVINST = null, P = null, WL = null, AC = null, lastFocus = null, CUR = null;
function openOv(label, dark){ if (OV.hidden){ try { history.pushState({ov:1, tab:CURTAB}, ""); } catch(e){} } lastFocus = document.activeElement; OV.classList.toggle("dark", !!dark); OV.hidden = false; OV.setAttribute("aria-label", label); document.documentElement.style.overflow = "hidden"; OV.scrollTop = 0; }
function closeOv(){ if (history.state && history.state.ov){ history.back(); return; } doCloseOv(); }
function doCloseOv(){
  unmount(OVINST); OVINST = null; OV.hidden = true; OV.classList.remove("dark"); OVIN.innerHTML = ""; document.documentElement.style.overflow = ""; CUR = null;
  if (P){ P = null; renderToday(); }
  if (WL){ try { WL.release(); } catch(e){} WL = null; }
  if (lastFocus && lastFocus.focus) lastFocus.focus();
  if (!$("#p-gestes").hidden) renderGestes();
}
function stageHTML(T){
  const mode = modeFor(T);
  if (!canTrace(T)) return `<div class="stage"><div class="stagebox" id="stage"></div></div>`;
  return `<div class="stage"><div class="stagebox" id="stage"></div>
    <div class="stagectl"><div class="seg" role="group" aria-label="Affichage">
      <button data-media="video" aria-pressed="${mode === "video"}">Vidéo</button><button data-media="trace" aria-pressed="${mode === "trace"}">Tracé précis</button></div>
      ${T.vue === "face" ? `<label class="sw-li" id="lymWrap"${mode === "trace" ? "" : " hidden"} style="display:flex;align-items:center;gap:10px;min-height:0"><span>Ganglions</span><input type="checkbox" class="switch" id="lymTgl" ${T.lymph ? "checked" : ""}></label>` : ""}</div>
    ${legendHTML(T)}</div>`;
}
function fillStage(id){
  const box = $("#stage"); if (!box) return;
  const T = TECH[id], mode = modeFor(T);
  unmount(OVINST); OVINST = null;
  const w = $("#lymWrap"); if (w) w.hidden = mode !== "trace";
  if (mode === "video"){
    box.innerHTML = `<video src="${MEDIA.v(id)}" poster="${MEDIA.g(id)}" autoplay muted loop playsinline aria-label="Vidéo du geste : ${esc(T.nom)}"></video>`;
    const v = box.querySelector("video");
    v.addEventListener("error", () => { if (CUR === id && modeFor(T) === "video"){ box.innerHTML = img(MEDIA.g(id), T.nom); } });
    v.play().catch(() => {});
  } else {
    OVINST = mountTrace(box, id, {lymph: $("#lymTgl") ? $("#lymTgl").checked : T.lymph});
    box.insertAdjacentHTML("beforeend", `<span class="glass">Direction et pression</span>`);
  }
}
const stepsHTML = T => `<ol class="steps">${T.etapes.map((e,i) => `<li><span class="n">${i+1}</span><span>${e}</span></li>`).join("")}</ol>`;
const warnHTML = T => T.attention ? `<div class="warn"><span class="ic">${ICON.alert}</span><div><b>Attention.</b> ${T.attention}</div></div>` : "";
function openFiche(id){
  const T = TECH[id], fav = favs().includes(id), c = CATS[T.cat]; CUR = id;
  const oil = T.huile && !/^(aucun|non)$/i.test(T.huile.trim()) ? T.huile : "";
  openOv(T.nom);
  OVIN.innerHTML = `<div class="sheet fiche" style="--c:${c.color}">
  <div class="sh-top"><button class="icon-btn" data-close aria-label="Retour">${ICON.chevL}</button><span></span><button class="icon-btn" data-fav="${id}" aria-pressed="${fav}" aria-label="${fav ? "Retirer de ma pratique" : "Ajouter à ma pratique"}">${ICON.bm}</button></div>
  <div class="fgrid">
    ${stageHTML(T)}
    <div class="ftext">
      <h1 class="d-title">${T.nom}</h1>
      <div class="fmeta"><span>${ICON.clock}${fmtDur(DUR[id] || 60)}</span><span>${ICON.hand}${T.p === 0 ? "Sans appui" : "Pression " + PRESSION[T.p].nom.toLowerCase()}</span>${oil ? `<span>${ICON.drop}${oil}</span>` : ""}</div>
      ${stepsHTML(T)}
      <div class="cta-bar"><button class="btn-full" data-fav="${id}" aria-pressed="${fav}">${ICON.bm}<span>${fav ? "Dans ma pratique" : "Ajouter à ma pratique"}</span></button></div>
    </div>
  </div></div>`;
  fillStage(id);
  $("[data-close]", OVIN).focus({preventScroll:true});
}
const fmtT = ms => { const s = Math.max(0, Math.ceil(ms/1000)); return String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s % 60).padStart(2,"0"); };
const fmtTH = ms => fmtT(ms);
function openPlayer(r){
  P = {r, R: ROUTINES[r], idx: 0, rem: ROUTINES[r].steps[0].s*1000, run: false, last: 0, auto: store.get("pv-auto", true), sound: store.get("pv-sound", true), half: false, fin: false};
  openOv(ROUTINES[r].nom);
  renderStep();
}
function stateText(){
  const st = P.R.steps[P.idx];
  if (P.run) return "En cours…";
  if (P.rem <= 0) return "Terminé";
  return P.rem < st.s*1000 ? "En pause" : "Prêt";
}
function syncPlay(){
  const b = $("#pPlay"), l = $("#pState"); if (!b) return;
  const nextMode = !P.run && P.rem <= 0;
  b.innerHTML = P.run ? ICON.pause : nextMode ? ICON.next : ICON.play;
  b.setAttribute("aria-label", P.run ? "Pause" : nextMode ? "Geste suivant" : "Lecture");
  if (l) l.textContent = stateText();
}
const TN = 23;
function syncRing(){
  const g = $("#pGauge"); if (!g) return;
  const tot = P.R.steps[P.idx].s * 1000, k = Math.round(TN * (1 - Math.max(0, P.rem) / tot));
  g.querySelectorAll(".s").forEach((s,i) => s.setAttribute("class", "s" + (i < k ? " d" : i === k && P.run ? " t" : "")));
}
function renderStep(){
  const R = P.R, st = R.steps[P.idx], T = TECH[st.id], c = CATS[T.cat], last = P.idx === R.steps.length - 1, n = R.steps.length; CUR = st.id;
  OVIN.innerHTML = `<div class="sheet player" style="--c:${c.color}">
  <div class="sh-top"><button class="icon-btn" data-close aria-label="Fermer la routine">${ICON.x}</button><div class="sh-mid"><b>${R.nom}</b><span>Geste ${P.idx+1} sur ${n}</span></div><span></span></div>
  <div class="segs">${R.steps.map((s,i) => `<i class="${i < P.idx ? "past" : i === P.idx ? "cur" : ""}"></i>`).join("")}</div>
  <div class="fgrid">
    ${stageHTML(T)}
    <div class="ftext">
      <h1 class="d-title">${T.nom}</h1>
      ${P.idx === 0 ? `<div class="prep"><span class="k">À préparer</span>${prepFor(R).map(x => `<span>${x}</span>`).join("")}</div>` : ""}
      ${st.note ? `<div class="note-b">${ICON.info}<span>${st.note}</span></div>` : ""}
      <div class="tcard">
        <div class="tg">${gaugeSVG(TN, () => "", "pGauge")}<div class="tg-c"><span class="lbl" id="pState" aria-live="polite"></span><div class="timer" id="pTimer" role="timer" aria-label="Temps restant">${fmtTH(P.rem)}</div></div></div>
        <div class="tinfo">${T.dose}</div>
        ${st.half ? `<div class="half">${ICON.swap}Signal à mi-temps : change de côté</div>` : ""}
        <div class="pctl">
          <button class="cbtn" data-prev aria-label="Geste précédent" ${P.idx === 0 ? "disabled" : ""}>${ICON.prev}</button>
          <button class="playbtn" data-play id="pPlay"></button>
          <button class="cbtn" data-next aria-label="${last ? "Terminer la routine" : "Geste suivant"}">${last ? ICON.check : ICON.next}</button>
        </div>
      </div>
      <div class="flash" id="pFlash" hidden>${ICON.swap}Change de côté</div>
      ${stepsHTML(T)}
    </div>
  </div></div>`;
  fillStage(st.id); syncPlay(); syncRing();
}
function go(i){ P.idx = i; P.rem = P.R.steps[i].s*1000; P.half = false; P.last = performance.now(); renderStep(); OV.scrollTop = 0; }
function beep(f){
  if (!P || !P.sound || !AC) return;
  try { const o = AC.createOscillator(), g = AC.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(.0001, AC.currentTime); g.gain.exponentialRampToValueAtTime(.2, AC.currentTime+.02); g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime+.4); o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime+.45); } catch(e){}
}
async function toggleRun(){
  if (!P) return;
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch(e){}
  if (P.rem <= 0){ if (P.idx < P.R.steps.length-1){ go(P.idx+1); P.run = true; syncPlay(); } return; }
  P.run = !P.run; P.last = performance.now();
  syncPlay();
  if (P.run && !WL){ try { WL = await navigator.wakeLock?.request("screen"); } catch(e){ WL = null; } }
}
function finish(){
  P.run = false; P.fin = true; markDone(P.r); unmount(OVINST); OVINST = null; CUR = null;
  OV.classList.remove("dark");
  const R = P.R, evening = P.r !== "matin", st = streak(mid(new Date()));
  const tdy = mid(new Date()), nx = planFor(tdy).find(x => !isDone(key(tdy), x));
  const next = nx ? [RICON[nx], "Ensuite aujourd'hui", `${ROUTINES[nx].nom}, ${mins(nx)} min.`] : ["sun", "Demain matin", `${planFor(addDays(tdy, 1)).map(x => ROUTINES[x].nom).join(", ")}.`];
  OVIN.innerHTML = `<div class="sheet"><div class="sh-top"><button class="icon-btn" data-close aria-label="Fermer">${ICON.x}</button><span></span><span></span></div>
  <div class="finish">
    <span class="fin-ok">${ICON.check}</span>
    <h1 class="fin-t">${R.nom}, c'est fait.</h1>
    <p class="fin-s">${next[1]} : ${next[2].replace(/\.$/, "")}</p>
    <button class="btn-full" data-close>Revenir à aujourd'hui</button>
  </div></div>`;
  beep(988); setTimeout(() => beep(1318), 180);
}
setInterval(() => {
  if (!P || !P.run || P.fin) return;
  const now = performance.now(); P.rem -= now - P.last; P.last = now;
  const st = P.R.steps[P.idx];
  if (st.half && !P.half && P.rem <= st.s*500){ P.half = true; beep(560); const f = $("#pFlash"); if (f){ f.hidden = false; setTimeout(() => { if (f.isConnected) f.hidden = true; }, 4000); } }
  if (P.rem <= 0){
    beep(880);
    if (P.idx === P.R.steps.length-1){ finish(); return; }
    if (P.auto){ go(P.idx+1); return; }
    P.run = false; P.rem = 0; syncPlay();
  }
  const t = $("#pTimer"); if (t) t.innerHTML = fmtTH(P.rem);
  syncRing();
}, 200);

/* ---------- Bannières et citations ---------- */
const QUOTES = [
  ["Ce que tu répètes chaque jour, ", "ton visage ", "le garde."],
  ["Relâcher d'abord, ", "tonifier ensuite, ", "drainer toujours."],
  ["La lymphe n'a pas de pompe. ", "Elle a ", "tes mains."],
  ["Dix minutes le matin ", "valent mieux ", "qu'une heure le dimanche."],
  ["Doux sur la peau, ", "patient ", "avec le résultat."],
  ["Des dents qui se desserrent, ", "c'est déjà ", "un soin."],
  ["Un soin qui te fait du bien ", "est un soin ", "que tu refais."],
  ["Mâche des deux côtés : ", "la symétrie commence ", "à table."],
  ["Ton visage n'a pas besoin de plus. ", "Il a besoin ", "de régularité."],
  ["Chaque tenue est ", "une conversation ", "avec un muscle."]
];
function bannerHTML(kind, say, fine, icon, kick, go){
  const [k0, fv] = kind.split(":"), k = k0 === "pink" ? "dots" : k0, tag = go ? "button" : "section";
  return `<${tag} class="banner ${k}${go ? " link" : ""}"${go ? ` data-tab="${go}"` : ""} aria-label="${esc(say.replace(/<[^>]+>/g, ""))}">${k === "glow" ? `<span class="field f-${fv || "lav"}" aria-hidden="true"></span>` : ""}<span class="bn-card">${kick ? `<span class="kick">${icon ? `<span class="it">${ICON[icon]}</span>` : ""}${kick}</span>` : ""}<span class="say">${say}</span>${fine ? `<span class="fine">${fine}</span>` : ""}${go ? `<span class="bn-go">En savoir plus${ICON.chevR}</span>` : ""}</span></${tag}>`;
}
const pillRow = (label, v, tot, c) => { const pct = Math.round(100 * v / tot); return `<div><div class="pl-l"><span>${label}</span><span>${v} sur ${tot}</span></div><div class="pl-w" style="--c:${c}"><div class="pl"><i style="width:calc(${Math.max(pct, 4)}% - 6px)"></i></div><em>${pct} %</em></div></div>`; };
const TIPS = [
  ["face", "Posture de repos", "Lèvres jointes, dents desserrées, langue posée contre le palais.", "habitudes"],
  ["utensils", "Mâcher des deux côtés", "Insiste sur le côté que tu utilises le moins.", "symetrie"],
  ["screen", "Écran à hauteur des yeux", "L'oreille au-dessus de l'épaule : le menton ne plonge pas vers le téléphone.", "habitudes"],
  ["moon", "Le soir", "Peu de sel au dîner : le visage est moins gonflé au réveil.", "habitudes"],
  ["moon", "Dormir sur le dos", "L'oreiller appuie sur le visage toute la nuit. À défaut, alterne les côtés.", "habitudes"],
  ["sun", "Écran solaire", "Le soleil pèse plus sur les rides que n'importe quel massage : protection chaque matin.", "soins"],
  ["apple", "Des protéines à chaque repas", "Le collagène se fabrique avec ce que tu manges.", "alimentation"],
  ["info", "Doux d'abord", "Une gêne de 4 sur 10 au maximum. Au-delà, le muscle se contracte au lieu de se relâcher.", "comprendre"],
  ["snow", "Le froid le matin", "Une cuillère passée au frigo, posée sous les yeux, aide à dégonfler.", "outils"],
  ["camera", "Les photos plutôt que le miroir", "Le visage change d'une heure à l'autre : compare tes photos entre elles.", "photos"]
];
/* Tuiles d'Apprendre : une case par élément, teintée selon son niveau de preuve */
function renderEvBits(){
  const src = {alim: ALIM, soins: SOINS, outils: OUTILS};
  $$("[data-ev]").forEach(el => {
    const d = src[el.dataset.ev], items = (d && (d.items || d)) || [], n = items.length; if (!n) return;
    const n4 = items.filter(x => x.preuve === 4).length;
    el.innerHTML = `<span class="evb-g" role="img" aria-label="${n4} sur ${n} au plus haut niveau de preuve">${items.map(x => `<i class="p${x.preuve || 1}"></i>`).join("")}</span><span class="evb-l">${n4} sur ${n} au plus haut niveau de preuve</span>`;
  });
}
function renderTip(){
  const d = new Date(), doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5), t = TIPS[doy % TIPS.length], el = $("#tip");
  if (el) el.innerHTML = bannerHTML("glow:jade", t[1], t[2], t[0], "Conseil du jour", t[3]);
}
function renderQuote(){
  const d = new Date(), doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5), q = QUOTES[doy % QUOTES.length];
  $("#quote").innerHTML = `<p class="twotone quote">${q[0]}<span>${q[1]}</span>${q[2]}</p>`;
}

/* ---------- Apprendre : fiches repliables ---------- */
const LF = {alim:"all", soins:"all", actus:"all"};
let RT = "matin";
const ALIM_G = {collagene:["Collagène","layers","var(--tone)"], eclat:["Éclat","sun","var(--posture)"], inflammation:["Anti-inflammatoire","leaf","var(--drain)"], uniformite:["Teint uniforme","tone","var(--release)"], "a-limiter":["À limiter","ban","var(--ink-2)"]};
const SOINS_G = {rides:["Rides","layers","var(--tone)"], eclat:["Éclat","sun","var(--posture)"], taches:["Taches","tone","var(--release)"], texture:["Texture","grid","var(--tool)"], hydratation:["Hydratation","drop","var(--drain)"], rougeurs:["Rougeurs","leaf","var(--drain)"], yeux:["Yeux","eye","var(--tool)"]};
const OUT_ICON = {guasha:"sparkle", rouleau:"roller", glissement:"drop", intrabuccal:"hand", froid:"snow", ventouses:"cup", vibrant:"wave", kansa:"sparkle", led:"sun", microcourant:"zap", ems:"zap", radiofrequence:"wave", kinesio:"layers", microneedling:"grid", brosse:"ban"};
const OUT_P = [["essentiel","Pour commencer"],["utile","Utiles"],["optionnel","Pour aller plus loin"],["à éviter","À éviter"]];
function srcLinks(urls){
  const lab = u => { try { const h = new URL(u).hostname.replace(/^www\./, ""); return /pubmed|ncbi/.test(h) ? "PubMed" : h === "doi.org" ? "DOI" : h.split(".").slice(-2, -1)[0].replace(/^./, c => c.toUpperCase()); } catch(e){ return "Source"; } };
  return (urls || []).length ? `<div class="links">${urls.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${ICON.ext}${lab(u)}</a>`).join("")}</div>` : "";
}
const sec = (h, body) => body ? `<div><h4>${h}</h4><p>${body}</p></div>` : "";
function xcard({c, icon, title, sub, body}){
  return `<details class="xcard" style="--c:${c}"><summary><span class="ic">${ICON[icon] || ICON.sparkle}</span><span class="tx"><b>${title}</b>${sub ? `<span>${sub}</span>` : ""}</span><span class="end">${ICON.chev}</span></summary><div class="xb">${body}</div></details>`;
}
const chipsHTML = (pg, map, cur, all="Tous") => `<div class="chips">${[["all", all, null, null], ...Object.entries(map).map(([k,v]) => [k, v[0], v[1], v[2]])].map(([k,l,ic,c]) => `<button class="chip${ic ? "" : " noic"}" data-lf="${pg}:${k}" aria-pressed="${cur === k}"${c ? ` style="--c:${c}"` : ""}>${ic ? ICON[ic] : ""}${l}</button>`).join("")}</div>`;
function renderAlim(){
  const items = ALIM.items.filter(i => LF.alim === "all" || i.but === LF.alim);
  $("#alimBody").innerHTML = chipsHTML("alim", ALIM_G, LF.alim)
    + `<div class="xlist">${items.map(i => { const g = ALIM_G[i.but] || ALIM_G.eclat;
        return xcard({c:g[2], icon:g[1], title:i.nom, sub:i.sources_alim, body: sec("Ce que ça fait", i.effet) + `<div class="do"><h4>En pratique</h4><p>${i.pratique}</p></div>`}); }).join("")}</div>`
    + `<div class="sec-h"><h2>Une journée type</h2></div><div class="list day-plan">${ALIM.journee.map(j => `<div class="li plain"><div class="tx"><b>${j.moment}</b><span>${j.menu}</span></div></div>`).join("")}</div>`;
}
function renderSoins(){
  const items = SOINS.items.filter(i => LF.soins === "all" || (i.buts || []).includes(LF.soins));
  const steps = SOINS.routine[RT] || [];
  $("#soinsBody").innerHTML = chipsHTML("soins", SOINS_G, LF.soins)
    + `<div class="xlist">${items.map(i => { const g = SOINS_G[(i.buts || [])[0]] || SOINS_G.eclat;
        return xcard({c:g[2], icon:g[1], title:i.nom, sub:(i.buts || []).map(b => (SOINS_G[b] || [b])[0]).join(", "), body:
          sec("Ce que ça fait", i.effet) + `<div class="do"><h4>En pratique</h4><p>${i.pratique}</p></div>` + (i.massage ? sec("Avec le massage", i.massage) : "")}); }).join("")}</div>`
    + `<div class="sec-h"><h2>Routine type</h2></div><div class="segtabs" role="tablist"><button role="tab" data-rt="matin" aria-selected="${RT === "matin"}">Matin</button><button role="tab" data-rt="soir" aria-selected="${RT === "soir"}">Soir</button></div>`
    + `<ol class="steps" style="--c:var(--accent)">${steps.map((s,k) => `<li><span class="n">${k+1}</span><span><b>${s.etape}.</b> ${s.detail}</span></li>`).join("")}</ol>`;
}
function renderOutils(){
  const card = i => xcard({c:i.priorite === "à éviter" ? "var(--ink-3)" : i.priorite === "essentiel" ? "#C9792F" : i.priorite === "utile" ? "#B0663A" : "#8A7356", icon:OUT_ICON[i.id], title:i.nom, sub:i.budget, body: sec("Comment ça agit", i.action) + `<div class="do"><h4>Comment t'en servir</h4><p>${i.usage}</p></div>`});
  $("#outilsBody").innerHTML = OUT_P.map(([k, h]) => { const list = OUTILS.items.filter(i => i.priorite === k); return list.length ? `<div class="sec-h${k === "essentiel" ? " first" : ""}"><h2>${h}</h2></div><div class="xlist">${list.map(card).join("")}</div>` : ""; }).join("");
}

/* ---------- Nouveautés (base partagée de l'artifact, mise à jour chaque semaine) ---------- */
let NEWS = [];
const NTYPE = {etude:["Étude","flask","var(--tone)"], reglementation:["Réglementation","shield","var(--tool)"], produit:["Produit","sparkle","var(--release)"], technique:["Technique","hand","var(--posture)"]};
const nDays = s => Math.floor((mid(new Date()) - parseKey(s)) / 864e5);
function nDate(s){
  const d = nDays(s); if (isNaN(d)) return "";
  if (d <= 0) return "Aujourd'hui"; if (d === 1) return "Hier"; if (d < 7) return `Il y a ${d} jours`;
  const dt = parseKey(s), same = dt.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("fr-FR", same ? {day:"numeric", month:"long"} : {day:"numeric", month:"short", year:"numeric"}).format(dt);
}
function ncard(n){
  const t = NTYPE[n.type] || NTYPE.etude, dt = parseKey(n.date || ""), ok = !isNaN(dt);
  return `<button class="ncard" data-news="${esc(n.id)}" style="--c:${t[2]}">${ok ? calHTML(MOIS[dt.getMonth()], dt.getDate(), DOW[dt.getDay()]) : ""}<span class="ntype">${ICON[t[1]]}${t[0]}</span><span class="nt">${esc(n.titre)}</span><span class="np">${esc(n.pourtoi || n.resume || "")}</span><span class="nsrc">${esc(n.source || "")}${ok ? ", " + nDate(n.date).toLowerCase() : ""}</span>${nDays(n.date) < 14 ? `<i class="fresh" aria-label="Récent"></i>` : ""}</button>`;
}
function renderNews(){
  const has = NEWS.length > 0, top = NEWS[0];
  const tk = $("#ticker"); if (tk){ tk.hidden = !has; if (has){ tk.dataset.news = top.id; $("#tickerT").textContent = top.titre; } }
  const nh = $("#newsHome"); if (nh){ nh.hidden = !has; if (has) $("#nrow").innerHTML = NEWS.slice(0, 6).map(ncard).join(""); }
  const ln = $("#learnNews"); if (ln) ln.innerHTML = `<button class="nbanner" data-tab="actus"><img class="bgimg" src="media/brand/field-night.webp" alt=""><span class="lk">${ICON.news}Nouveautés</span><b>${has ? esc(top.titre) : "Études, produits, réglementation"}</b><span class="ns">${has ? esc(top.source || "") + (top.date ? ", " + nDate(top.date).toLowerCase() : "") : "Ce qui change pour ta peau, avec la source."}</span><span class="go">Tout voir${ICON.chevR}</span></button>`;
  const nl = $("#nlist"); if (!nl) return;
  $("#nchips").innerHTML = chipsHTML("actus", Object.fromEntries(Object.entries(NTYPE).map(([k,v]) => [k, v])), LF.actus, "Tout").replace(/^<div class="chips">|<\/div>$/g, "");
  const list = NEWS.filter(n => LF.actus === "all" || n.type === LF.actus);
  nl.innerHTML = list.length ? list.map(ncard).join("") : `<div class="nempty">${NEWS_STATE === "off" ? "Les nouveautés s'affichent quand l'app est ouverte dans claude.ai." : NEWS_STATE === "wait" ? "Chargement des nouveautés…" : "Aucune nouveauté dans cette catégorie pour l'instant."}</div>`;
}
let NEWS_STATE = "wait";
async function initNews(){
  const c = window.claude;
  const local = () => { NEWS = (typeof NEWS_LOCAL !== "undefined" ? NEWS_LOCAL : []).filter(n => n.titre && n.date).sort((a,b) => b.date.localeCompare(a.date)); NEWS_STATE = NEWS.length ? "on" : "off"; renderNews(); };
  if (!c || typeof c.use !== "function"){ local(); return; }
  let db = null; try { db = await c.use("db"); } catch(e){ db = null; }
  if (!db){ local(); return; }
  try {
    db.collection("news").orderBy("date", "desc").limit(80).onSnapshot(snap => {
      NEWS = snap.docs.map(d => ({id: d.id, ...d.data()})).filter(n => n.titre && n.date);
      NEWS_STATE = "on"; renderNews();
    }, () => local());
  } catch(e){ local(); }
}
function openNews(id){
  const n = NEWS.find(x => x.id === id); if (!n) return;
  const t = NTYPE[n.type] || NTYPE.etude;
  openOv(n.titre);
  OVIN.innerHTML = `<div class="sheet ndetail" style="--c:${t[2]}">
    <div class="sh-top"><button class="icon-btn" data-close aria-label="Retour">${ICON.chevL}</button><div class="sh-mid"><b>Nouveauté</b></div><span></span></div>
    <div style="max-width:640px;margin:0 auto">
      <div class="nmeta"><span class="ntype">${ICON[t[1]]}${t[0]}</span><span class="ndate">${nDate(n.date)}</span></div>
      <h1 class="big-t">${esc(n.titre)}</h1>
      <p class="lede">${esc(n.resume || "")}</p>
      ${n.pourtoi ? `<div class="foryou">${ICON.sparkle}<div><b>Pour toi</b>${esc(n.pourtoi)}</div></div>` : ""}
      ${(n.tags || []).length ? `<div class="chipset" style="margin-bottom:18px">${n.tags.map(g => `<span class="rchip" style="--c:var(--ink-2)">${esc(g)}</span>`).join("")}</div>` : ""}
      <p class="hint" style="margin-bottom:12px">Source : ${esc(n.source || "")}</p>
      ${n.url ? `<a class="srcbtn" href="${esc(n.url)}" target="_blank" rel="noopener">${ICON.ext}Lire la source</a>` : ""}
    </div></div>`;
  $("[data-close]", OVIN).focus({preventScroll:true});
}

/* ---------- Pages internes : couleur et bannière ---------- */
const SUBT = {
  alimentation:["#3E9B68", "glow:jade", "Ta peau se construit <span>aussi dans l'assiette.</span>", "Les effets se voient après quelques semaines, pas en quelques jours."],
  soins:["#C95B8E", "glow:blush", "Un actif à la fois, <span>un écran solaire chaque matin.</span>", "Ce que fait chaque actif, et comment le placer autour du massage."],
  outils:["#C9792F", "glow:lav", "Le meilleur outil <span>est celui que tu reprends.</span>", "Commence simple : tes mains, une huile, un gua sha."],
  comprendre:["#4F7FD0", "glow:lav", "Ce que tes mains changent, <span>et ce qu'elles ne changent pas.</span>", ""],
  symetrie:["#7A5FC2", "glow:blush", "Ton côté tendu <span>reçoit les tenues les plus longues.</span>", ""],
  habitudes:["#2E8C83", "glow:jade", "Les 23 autres heures <span>comptent autant que la routine.</span>", ""]
};
function subTheme(name){
  const t = SUBT[name], p = $("#p-" + name); if (!t || !p) return;
  p.style.setProperty("--pc", t[0]);
  const h = p.querySelector("h1.title"); if (h && !p.querySelector(".subban")) h.insertAdjacentHTML("afterend", `<div class="subban">${bannerHTML(t[1], t[2], t[3])}</div>`);
}

/* ---------- Navigation ---------- */
const PARENT = {comprendre:"apprendre", symetrie:"apprendre", habitudes:"apprendre", anastasia:"apprendre", securite:"apprendre", sources:"apprendre", alimentation:"apprendre", soins:"apprendre", outils:"apprendre", actus:"apprendre"};
const mounted = new Set();
let CURTAB = null;
function showTab(name, fromPop){
  if (!$("#p-" + name)) name = "aujourdhui";
  const top = PARENT[name] || name;
  $$(".tabbar .tab").forEach(t => t.setAttribute("aria-selected", t.dataset.tab === top));
  $$(".panel").forEach(p => p.hidden = p.id !== "p-" + name);
  if (!mounted.has(name)){
    mounted.add(name);
    if (name === "apprendre"){ $("#learnBanner").innerHTML = bannerHTML("glow:blush", "Comprendre ce que tu fais, <span>c'est déjà mieux le faire.</span>", `<span class="stats3"><button data-tab="alimentation"><b>${ALIM.items.length}</b><span>aliments</span></button><button data-tab="soins"><b>${SOINS.items.length}</b><span>actifs</span></button><button data-tab="outils"><b>${OUTILS.items.length}</b><span>outils</span></button></span>`); renderNews(); }
    subTheme(name);
    if (name === "alimentation") renderAlim();
    if (name === "soins") renderSoins();
    if (name === "outils") renderOutils();
    if (name === "comprendre") mountMap($("#lymphMap"));
  }
  if (name === "gestes") renderGestes();
  if (name === "actus") renderNews();
  if (name === "aujourdhui") renderToday();
  if (name === "reglages") renderReglages();
  if (name === "photos") renderPhotos();
  closePop();
  try { if (!fromPop){ if (CURTAB === null || CURTAB === name) history.replaceState({tab:name}, "", "#" + name); else history.pushState({tab:name}, "", "#" + name); } } catch(e){}
  CURTAB = name;
}
window.addEventListener("popstate", e => {
  if (!OV.hidden){ doCloseOv(); return; }
  const t = (e.state && e.state.tab) || (location.hash || "").replace("#", "") || "aujourdhui";
  showTab(t, true); window.scrollTo({top:0});
});
function staticTabs(){}

/* ---------- Événements ---------- */
/* ---------- Easter egg : le chat Défroisse ----------
   Un tap sur le logo lui fait remuer les oreilles ; au troisième tap rapproché, le rouleau de jade le défroisse.
   Il se cache aussi dans la recherche : « chat », « miaou », « ronron ». */
const CAT_LINES = ["Zéro pli, cent pour cent ronron.", "Le chat valide ta routine.", "Niveau de preuve : ronron.", "Pattes de velours, visage de velours.", "Même le chat a fait sa séance."];
let catTaps = 0, catTimer = 0, catOn = false;
function catTap(el){
  el.classList.remove("wig"); void el.offsetWidth; el.classList.add("wig");
  clearTimeout(catTimer); catTaps++;
  if (catTaps >= 3){ catTaps = 0; catShow(); return; }
  catTimer = setTimeout(() => { catTaps = 0; }, 900);
}
function purr(){
  if (!store.get("pv-sound", true)) return;
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    const ac = new A(), dur = 1.7, sr = ac.sampleRate, buf = ac.createBuffer(1, Math.floor(sr * dur), sr), d = buf.getChannelData(0);
    let last = 0, pk = 0;
    for (let i = 0; i < d.length; i++){ last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last; pk = Math.max(pk, Math.abs(last)); }
    for (let i = 0; i < d.length; i++) d[i] = d[i] / pk * .9;
    const src = ac.createBufferSource(); src.buffer = buf;
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 380;
    const am = ac.createGain(); am.gain.value = .55;
    const lfo = ac.createOscillator(); lfo.frequency.value = 23; const depth = ac.createGain(); depth.gain.value = .45; lfo.connect(depth); depth.connect(am.gain);
    const env = ac.createGain(), t = ac.currentTime;
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(.32, t + .3); env.gain.setValueAtTime(.32, t + dur - .5); env.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(lp); lp.connect(am); am.connect(env); env.connect(ac.destination);
    src.start(t); lfo.start(t); src.stop(t + dur); lfo.stop(t + dur);
    setTimeout(() => { try { ac.close(); } catch(e){} }, (dur + .4) * 1000);
  } catch(e){}
}
function catShow(){
  if (catOn) return; catOn = true;
  const ov = document.createElement("div");
  ov.className = "catov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Défroissé");
  ov.innerHTML = CAT_SVG + `<div class="cap"><b>Défroissé.</b><span>${CAT_LINES[Math.floor(Math.random() * CAT_LINES.length)]}</span></div>`;
  document.body.appendChild(ov);
  let shut = false;
  const close = () => { if (shut) return; shut = true; ov.classList.remove("on"); setTimeout(() => { ov.remove(); catOn = false; }, 320); };
  ov.addEventListener("click", close);
  requestAnimationFrame(() => { ov.classList.add("on"); requestAnimationFrame(() => ov.classList.add("go")); });
  setTimeout(purr, 450);
  setTimeout(() => { try { navigator.vibrate && navigator.vibrate([12, 70, 12]); } catch(e){} }, 2150);
  setTimeout(close, 5600);
}

document.addEventListener("keydown", e => { const ct = e.target.closest && e.target.closest("[data-cat]"); if (ct && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); catTap(ct); } });
document.addEventListener("click", e => {
  const ct = e.target.closest("[data-cat]"); if (ct){ catTap(ct); return; }
  const pop = $("#pop");
  if (pop && !pop.hidden && !e.target.closest("#pop, [data-chip='filters']")) closePop();
  const t = e.target.closest("button, [data-close]"); if (!t) return;
  if (t.hasAttribute("data-catshow")){ catShow(); return; }
  if (onbClick(t)) return;
  if (photosClick(t)) return;
  if (t.hasAttribute("data-onbopen")){ onbOpen(); return; }
  if (t.hasAttribute("data-back")){ if (history.state && history.length > 1) history.back(); else showTab("apprendre"); return; }
  if (t.dataset.goto === "bilan"){ showTab("programme"); setTimeout(() => { const b = $("#bilan"); if (b) b.scrollIntoView({behavior: "smooth", block: "start"}); }, 60); return; }
  if (t.dataset.goal){ const gs = goals(), g = t.dataset.goal, i = gs.indexOf(g); if (i >= 0) gs.splice(i, 1); else gs.push(g); t.setAttribute("aria-pressed", i < 0); setGoals(gs); return; }
  if (t.dataset.ts){ store.set("pv-ts", t.dataset.ts); applyTS(); renderReglages(); return; }
  if (t.dataset.bil){ const [k, v] = t.dataset.bil.split(":"); bilSet(k, k === "c" ? v : +v); renderBilan(); bilNudge(); return; }
  if (t.dataset.bilstep){ const wk = wkKey(mid(new Date())), cur = (store.get("pv-notes", {})[wk] || {}).n ?? 0; bilSet("n", Math.max(0, Math.min(7, cur + (+t.dataset.bilstep)))); renderBilan(); bilNudge(); return; }
  if (t.hasAttribute("data-backup")){ bkShow(); return; }
  if (t.hasAttribute("data-restore")){ bkRestore(); return; }
  if (t.hasAttribute("data-today")){ SEL = mid(new Date()); renderToday(); return; }
  if (t.dataset.tab){ if (!OV.hidden){ doCloseOv(); try { history.replaceState({tab:CURTAB}, "", "#" + CURTAB); } catch(err){} } showTab(t.dataset.tab); window.scrollTo({top:0}); return; }
  if (t.dataset.ft){ const sh = t.closest(".ftext"); $$("[data-ft]", sh).forEach(b => b.setAttribute("aria-selected", b === t)); $$("[data-tp]", sh).forEach(p => p.hidden = p.dataset.tp !== t.dataset.ft); return; }
  if (t.dataset.fav){ e.stopPropagation(); const on = toggleFav(t.dataset.fav); syncFavN();
    if (!OV.hidden && t.closest(".sheet")){ $$(`[data-fav="${t.dataset.fav}"]`, OVIN).forEach(b => { b.setAttribute("aria-pressed", on); const sp = b.querySelector("span"); if (sp) sp.textContent = on ? "Dans ma pratique" : "Ajouter à ma pratique"; if (b.classList.contains("icon-btn")) b.setAttribute("aria-label", on ? "Retirer de ma pratique" : "Ajouter à ma pratique"); }); }
    else renderGestes(); return; }
  if (t.hasAttribute("data-mine")){ F.view = "fav"; F.goals = []; showTab("gestes"); window.scrollTo({top:0}); return; }
  if (t.dataset.chip){ const k = t.dataset.chip;
    if (k === "all"){ F.view = "all"; F.goals = []; }
    else if (k === "fav") F.view = F.view === "fav" ? "all" : "fav";
    else if (k === "filters"){ openPop(); return; }
    else { const g = k.slice(5), i = F.goals.indexOf(g); if (i >= 0) F.goals.splice(i,1); else F.goals.push(g); }
    renderGestes(); return; }
  if (t.dataset.news){ openNews(t.dataset.news); return; }
  if (t.dataset.lf){ const [pg, v] = t.dataset.lf.split(":"); LF[pg] = v; ({alim:renderAlim, soins:renderSoins, actus:renderNews})[pg](); return; }
  if (t.dataset.rt){ RT = t.dataset.rt; renderSoins(); return; }
  if (t.dataset.run){ openPlayer(t.dataset.run); return; }
  if (t.dataset.fiche){ openFiche(t.dataset.fiche); return; }
  if (t.dataset.opt){ const [k,v] = t.dataset.opt.split(":"); const a = F[k], val = k === "cats" ? v : +v, i = a.indexOf(val); if (i >= 0) a.splice(i,1); else a.push(val); t.setAttribute("aria-pressed", a.includes(val)); renderGestes(); return; }
  if (t.dataset.goq){ doCloseOv(); try { history.replaceState({tab:CURTAB}, "", "#" + CURTAB); } catch(err){} F.q = CIBLES[t.dataset.goq].nom; F.view = "all"; F.goals = []; showTab("gestes"); const qi = $("#q"); if (qi) qi.value = F.q; renderGestes(); window.scrollTo({top:0}); return; }
  if (t.dataset.q){ F.q = t.dataset.q; const qi = $("#q"); if (qi) qi.value = F.q; renderGestes(); return; }
  if (t.id === "qclear"){ F.q = ""; const qi = $("#q"); if (qi){ qi.value = ""; qi.focus(); } renderGestes(); return; }
  if (t.hasAttribute("data-clear")){ F.p = []; F.pr = []; F.cats = []; $$("#pop [data-opt]").forEach(b => b.setAttribute("aria-pressed", "false")); renderGestes(); return; }
  if (t.hasAttribute("data-closepop")){ closePop(); return; }
  if (t.dataset.rm){ const [k,v] = t.dataset.rm.split(":"), kk = k === "cat" ? "cats" : k; F[kk] = F[kk].filter(x => String(x) !== v); renderGestes(); return; }
  if (t.dataset.media){ store.set("pv-media", t.dataset.media); $$("[data-media]").forEach(b => b.setAttribute("aria-pressed", b === t)); if (CUR) fillStage(CUR); return; }
  if (t.dataset.k){ SEL = parseKey(t.dataset.k); renderToday(); return; }
  if (t.hasAttribute("data-close")){ closeOv(); return; }
  if (t.hasAttribute("data-start")){ store.set("pv-start", key(new Date())); renderProgram(); renderToday(); return; }
  if (t.hasAttribute("data-reset")){ try { localStorage.removeItem("pv-start"); } catch(err){} renderProgram(); renderToday(); if (CURTAB === "reglages") renderReglages(); return; }
  if (t.hasAttribute("data-play")){ if (P && P.rem <= 0 && !P.run && P.idx < P.R.steps.length-1){ go(P.idx+1); } else toggleRun(); return; }
  if (t.hasAttribute("data-prev")){ if (P && P.idx > 0) go(P.idx-1); return; }
  if (t.hasAttribute("data-next")){ if (!P) return; if (P.idx === P.R.steps.length-1) finish(); else go(P.idx+1); return; }
});
document.addEventListener("change", e => {
  if (e.target.id === "dayIn" && e.target.value){ SEL = parseKey(e.target.value); renderToday(); return; }
  if ((e.target.id === "startDate" || e.target.id === "setStart") && e.target.value){ store.set("pv-start", e.target.value); renderProgram(); renderToday(); if (e.target.id === "setStart") renderReglages(); }
  if (e.target.id === "onbDate" && e.target.value && ONB){ ONB.other = e.target.value; }
  if (e.target.id === "bilT"){ bilSet("t", +e.target.value); renderBilan(); bilNudge(); }
  if (e.target.id === "setSound"){ store.set("pv-sound", e.target.checked); }
  if (e.target.id === "setAuto"){ store.set("pv-auto", e.target.checked); }
  if (e.target.id === "lymTgl" && OVINST){ const g = OVINST.svg.querySelector(".lymph"); if (g) g.setAttribute("display", e.target.checked ? "inline" : "none"); }
});
document.addEventListener("input", e => { if (e.target.id === "q"){ F.q = e.target.value; renderGestes(); } if (e.target.id === "bilT"){ const o = $("#bilTo"); if (o) o.textContent = e.target.value; } });
document.addEventListener("mouseover", e => { const c = e.target.closest(".gc"); if (c && !c.contains(e.relatedTarget)) hoverOn(c); });
document.addEventListener("mouseout", e => { const c = e.target.closest(".gc"); if (c && !c.contains(e.relatedTarget)) hoverOff(c); });
document.addEventListener("keydown", e => {
  const pop = $("#pop");
  if (e.key === "Escape" && pop && !pop.hidden){ closePop(); return; }
  if (OV.hidden) return;
  if (e.key === "Escape"){ closeOv(); return; }
  if (!P || P.fin || e.target.closest("input, textarea, summary")) return;
  if (e.key === " " && !e.target.closest("button")){ e.preventDefault(); toggleRun(); }
  if (e.key === "ArrowRight"){ if (P.idx < P.R.steps.length-1) go(P.idx+1); }
  if (e.key === "ArrowLeft"){ if (P.idx > 0) go(P.idx-1); }
});
document.addEventListener("visibilitychange", () => { if (!document.hidden && P && P.run && !WL){ navigator.wakeLock?.request("screen").then(w => WL = w).catch(() => {}); } });


/* ---------- Taille du texte, objectifs ---------- */
const TS = [["1", "Normale"], ["1.12", "Grande"], ["1.25", "Très grande"]];
function applyTS(){ document.documentElement.style.setProperty("--ts", store.get("pv-ts", "1")); }
applyTS();
const GOAL_OPTS = [["rides", "Rides et ridules", "lines"], ["sillons", "Sillons et coins de la bouche", "face"], ["gonflement", "Gonflement du matin", "drop"], ["ovale", "Ovale et double menton", "ovale"], ["machoire", "Mâchoire serrée", "tooth"], ["posture", "Posture", "posture"]];
const GOAL_CIB = {rides:["rides","front","pattesoie","glabelle","levres","menton","cou"], sillons:["sillons","amertume"], gonflement:["gonflement","cernes"], ovale:["ovale","doublementon"], machoire:["machoire","tension"], posture:["posture","symetrie"]};
/* Pour chaque objectif, la routine la plus ciblée (part de ses cibles qui y répondent) */
function forYouSet(){
  const out = new Set();
  goals().forEach(g => { let best = 0, bs = [];
    Object.keys(ROUTINES).forEach(r => { const rc = ROUTINE_CIB[r] || []; if (!rc.length) return; const v = rc.filter(c => (GOAL_CIB[g] || []).includes(c)).length / rc.length; if (v > best + 1e-9){ best = v; bs = [r]; } else if (v > 0 && Math.abs(v - best) < 1e-9) bs.push(r); });
    bs.forEach(r => out.add(r)); });
  return out;
}
const goalChips = sel => `<div class="goalgrid">${GOAL_OPTS.map(([k, l, ic]) => `<button class="goalc" data-goal="${k}" aria-pressed="${sel.includes(k)}">${ICON[ic] || ""}<span>${l}</span>${ICON.check}</button>`).join("")}</div>`;
function setGoals(gs){ store.set("pv-goals", gs); renderToday(); if (mounted.has("programme")) renderProgram(); }

/* ---------- Accueil au premier lancement ---------- */
const hasData = () => !!store.get("pv-start", null) || Object.keys(store.get("pv-done", {})).length > 0 || favs().length > 0;
let ONB = null;
function onbMaybe(){ if (store.get("pv-onb", false)) return; if (hasData()){ store.set("pv-onb", true); return; } onbOpen(); }
function onbOpen(){
  const t = mid(new Date()), nm = addDays(t, ((8 - t.getDay()) % 7) || 7);
  ONB = {step: 0, goals: [...goals()], ts: store.get("pv-ts", "1"), when: "today", today: key(t), next: key(nm), other: key(addDays(t, 1)), prevTS: store.get("pv-ts", "1")};
  let el = $("#onb"); if (!el){ el = document.createElement("div"); el.id = "onb"; el.className = "onb"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Bienvenue dans Défroisse"); document.body.appendChild(el); }
  el.hidden = false; document.body.style.overflow = "hidden"; onbRender();
}
function onbClose(save){
  if (save){ store.set("pv-goals", ONB.goals); store.set("pv-ts", ONB.ts); store.set("pv-start", ONB.when === "today" ? ONB.today : ONB.when === "next" ? ONB.next : ONB.other); }
  else { store.set("pv-ts", ONB.prevTS); }
  store.set("pv-onb", true); applyTS();
  const el = $("#onb"); if (el){ el.classList.add("out"); setTimeout(() => { el.hidden = true; el.classList.remove("out"); }, 280); }
  document.body.style.overflow = ""; ONB = null;
  renderToday(); if (mounted.has("programme")) renderProgram(); if (CURTAB === "reglages") renderReglages();
}
function onbRender(){
  const o = ONB, el = $("#onb"), N = 4;
  const dots = `<div class="onb-dots" aria-hidden="true">${Array.from({length: N}, (_, i) => `<i class="${i <= o.step ? "on" : ""}"></i>`).join("")}</div>`;
  const back = o.step ? `<button class="icon-btn" data-onb="back" aria-label="Étape précédente">${ICON.chevL}</button>` : `<span></span>`;
  const top = `<div class="onb-top">${back}${dots}<button class="linkbtn" data-onb="skip">${o.step ? "Plus tard" : "Passer"}</button></div>`;
  const ph1 = mins("matin") + mins("soir");
  let body = "", cta = "Continuer";
  if (o.step === 0){
    cta = "C'est parti";
    body = `<div class="onb-hero" aria-hidden="true"><div class="field f-lav"></div><span class="tile"><span class="onb-logo"></span></span></div><h1>Bienvenue dans <span>Défroisse</span></h1>
      <p class="lede">Douze semaines de massages du visage, quelques minutes par jour. L'app te dit quoi faire et combien de temps.</p>
      <ul class="onb-list"><li>${ICON.clock}<span><b>Des routines minutées</b> geste par geste, avec une vidéo pour chacun.</span></li><li>${ICON.lock}<span><b>Tout reste sur ton téléphone</b>, sans compte ni inscription.</span></li></ul>`;
  } else if (o.step === 1){
    body = `<h1>Qu'est‑ce qui compte <span>le plus pour toi ?</span></h1><p class="lede">Choisis-en un ou plusieurs. L'app met en avant les routines qui y répondent, et tu pourras changer plus tard.</p>${goalChips(o.goals)}`;
  } else if (o.step === 2){
    body = `<h1>Confort <span>de lecture</span></h1><p class="lede">Choisis la taille qui te convient le mieux.</p>
      <div class="seg big" role="radiogroup" aria-label="Taille du texte">${TS.map(([v, l]) => `<button role="radio" aria-checked="${o.ts === v}" data-onbts="${v}"><span style="font-size:${Math.round(17 * parseFloat(v))}px">Aa</span>${l}</button>`).join("")}</div>
      <div class="onb-prev"><b>Ouvrir les terminus</b><p>Pose deux doigts au creux au-dessus de la clavicule et fais de petits cercles lents, sans appuyer.</p></div>`;
  } else {
    cta = "Commencer";
    const opt = (k, l, d, extra) => `<button class="onb-opt" role="radio" aria-checked="${o.when === k}" data-onbwhen="${k}"><span class="r" aria-hidden="true"></span><span class="tx"><b>${l}</b><span>${d}</span></span>${extra || ""}</button>`;
    body = `<h1>Quand veux‑tu <span>commencer ?</span></h1>
      <div class="onb-opts" role="radiogroup">${opt("today", "Aujourd'hui", fmtChip(parseKey(o.today)))}${opt("next", "Lundi prochain", fmtChip(parseKey(o.next)))}${opt("other", "Une autre date", o.when === "other" ? "" : "Choisis le jour")}</div>
      ${o.when === "other" ? `<label class="onb-date"><span>Date de départ</span><input type="date" id="onbDate" value="${o.other}"></label>` : ""}
      <p class="onb-note">${ICON.info}<span>Les deux premières semaines sont douces : une routine le matin et une le soir, environ ${ph1} minutes par jour. Le programme s'étoffe ensuite.</span></p>`;
  }
  el.innerHTML = `<div class="onb-in">${top}<div class="onb-body s${o.step}">${body}</div><div class="onb-foot"><button class="btn-full" data-onb="next">${cta}</button></div></div>`;
  const f = el.querySelector("h1"); if (f){ f.setAttribute("tabindex", "-1"); f.focus({preventScroll: true}); }
}
function onbClick(t){
  if (!ONB) return false;
  const a = t.dataset.onb;
  if (a === "skip"){ onbClose(false); return true; }
  if (a === "back"){ ONB.step = Math.max(0, ONB.step - 1); onbRender(); return true; }
  if (a === "next"){ if (ONB.step === 3){ onbClose(true); return true; } ONB.step++; onbRender(); return true; }
  if (t.dataset.goal && t.closest("#onb")){ const g = t.dataset.goal, i = ONB.goals.indexOf(g); if (i >= 0) ONB.goals.splice(i, 1); else ONB.goals.push(g); t.setAttribute("aria-pressed", i < 0); return true; }
  if (t.dataset.onbts){ ONB.ts = t.dataset.onbts; document.documentElement.style.setProperty("--ts", ONB.ts); onbRender(); return true; }
  if (t.dataset.onbwhen){ ONB.when = t.dataset.onbwhen; onbRender(); return true; }
  return false;
}

/* ---------- Bilan de la semaine ---------- */
const wkKey = d => key(addDays(d, -((d.getDay() + 6) % 7)));
const BIL_C = [["g", "Gauche"], ["2", "Les deux"], ["d", "Droite"]];
function spark(vals, max, label){
  const W = 132, H = 40, n = vals.length, x = i => n === 1 ? W / 2 : 4 + i * (W - 8) / (n - 1), y = v => H - 5 - (v / max) * (H - 10);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<div class="spk"><span>${label}</span><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${pts}"/>${vals.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === n - 1 ? 3.2 : 2.2}"/>`).join("")}</svg><b>${vals[n - 1]}<small> / ${max}</small></b></div>`;
}
function renderBilan(){
  if (!$("#bilan")) return;
  const el = $("#bilan"); if (!el) return;
  const today = mid(new Date()), wk = wkKey(today), all = store.get("pv-notes", {}), v = all[wk] || {};
  const seg = (k, opts) => `<div class="seg" role="radiogroup">${opts.map(([x, l]) => `<button role="radio" aria-checked="${String(v[k]) === String(x)}" data-bil="${k}:${x}">${l}</button>`).join("")}</div>`;
  const hist = Object.keys(all).sort().filter(k => all[k].g !== undefined || all[k].t !== undefined).slice(-12);
  const gs = hist.map(k => all[k].g).filter(x => x !== undefined), tsv = hist.map(k => all[k].t).filter(x => x !== undefined);
  const done = ["g", "t", "n", "c"].filter(k => v[k] !== undefined).length;
  el.innerHTML = `<div class="box bilan" style="--c:var(--posture)">
    <div class="box-h"><span class="ic">${ICON.note}</span><b>Bilan de la semaine</b><span class="bil-w">Semaine du ${new Intl.DateTimeFormat("fr-FR", {day: "numeric", month: "short"}).format(parseKey(wk))}</span></div>
    <div class="bil-row"><div class="bil-l"><b>Gonflement au réveil</b><span>0 : aucun, 3 : très marqué</span></div>${seg("g", [[0, "0"], [1, "1"], [2, "2"], [3, "3"]])}</div>
    <div class="bil-row"><div class="bil-l"><b>Tension de la mâchoire</b><span>Au réveil, de 0 à 10</span></div><div class="rng"><input type="range" min="0" max="10" step="1" id="bilT" value="${v.t ?? 0}" aria-label="Tension de la mâchoire, de 0 à 10"><output id="bilTo">${v.t ?? "–"}</output></div></div>
    <div class="bil-row"><div class="bil-l"><b>Nuits passées sur le dos</b><span>Sur les 7 dernières</span></div><div class="stepper"><button data-bilstep="-1" aria-label="Une nuit de moins">${ICON.minus}</button><output>${v.n ?? 0}</output><button data-bilstep="1" aria-label="Une nuit de plus">${ICON.plus}</button></div></div>
    <div class="bil-row"><div class="bil-l"><b>Côté de mastication</b><span>Observé pendant un repas</span></div>${seg("c", BIL_C)}</div>
    <p class="hint">${done === 4 ? `${ICON.check} Bilan complet, enregistré sur ce téléphone.` : done ? "Enregistré au fur et à mesure." : "Trente secondes, une fois par semaine. Tout s'enregistre tout seul."}</p>
    <div class="bil-hist">${gs.length >= 2 || tsv.length >= 2 ? (gs.length >= 2 ? spark(gs, 3, "Gonflement") : "") + (tsv.length >= 2 ? spark(tsv, 10, "Tension") : "") : `<p class="hint">Les courbes apparaissent après deux bilans.</p>`}</div>
    <p class="hint">Compare tes photos entre elles plutôt qu'au miroir du jour : le liquide change d'une heure à l'autre et masque les évolutions lentes.</p>
  </div>`;
}
function bilSet(k, val){ const wk = wkKey(mid(new Date())), all = store.get("pv-notes", {}); all[wk] = {...(all[wk] || {}), [k]: val}; store.set("pv-notes", all); }
function bilNudge(){
  const el = $("#nudge"); if (!el) return;
  el.innerHTML = photoNudgeHTML(); return;
  const t = mid(new Date()), d = t.getDay(), has = !!store.get("pv-notes", {})[wkKey(t)];
  el.innerHTML = (d === 0 || d >= 5) && !has && store.get("pv-start", null) ? `<button class="nudge" data-goto="bilan"><span class="ic">${ICON.note}</span><span class="tx"><b>Bilan de la semaine</b><span>Trente secondes pour suivre gonflement et tension.</span></span>${ICON.chevR}</button>` : "";
}

/* ---------- Réglages ---------- */
let RS_ARMED = false;
function renderReglages(){
  const el = $("#setBody"); if (!el) return;
  const st = store.get("pv-start", null), ts = store.get("pv-ts", "1"), ver = ($(".ver") || {}).textContent || "";
  el.innerHTML = `
  <div class="sec-h"><h2>Lecture</h2></div>
  <div class="box"><div class="seg big" role="radiogroup" aria-label="Taille du texte">${TS.map(([v, l]) => `<button role="radio" aria-checked="${ts === v}" data-ts="${v}"><span style="font-size:${Math.round(17 * parseFloat(v))}px">Aa</span>${l}</button>`).join("")}</div></div>
  <div class="sec-h"><h2>Tes objectifs</h2></div>
  <div class="box">${goalChips(goals())}</div>
  <div class="sec-h"><h2>Départ du programme</h2></div>
  <div class="box"><label class="setrow"><span>Date de départ</span><input type="date" class="datein" id="setStart" value="${st || ""}"></label>${st ? `<button class="btn sec sm" data-reset>Effacer la date</button>` : ""}</div>
  <div class="sec-h"><h2>Pendant les routines</h2></div>
  <div class="list"><label class="li sw-li plain"><span>Signal sonore</span><input type="checkbox" class="switch" id="setSound" ${store.get("pv-sound", true) ? "checked" : ""}></label><label class="li sw-li plain"><span>Enchaîner les gestes</span><input type="checkbox" class="switch" id="setAuto" ${store.get("pv-auto", true) ? "checked" : ""}></label></div>
  <div class="sec-h"><h2>Sauvegarde</h2></div>
  <div class="box"><p class="prose">Garde ce code pour retrouver ta progression sur un autre téléphone. Les photos n'y sont pas.</p>
    <button class="btn sec sm" data-backup>${ICON.file}Afficher mon code</button>
    <div id="bkOut" hidden><textarea readonly id="bkCode" rows="3" aria-label="Code de sauvegarde"></textarea><p class="hint" id="bkMsg" aria-live="polite"></p></div>
    <details class="restore"><summary>Restaurer une sauvegarde${ICON.chev}</summary><textarea id="bkIn" rows="3" placeholder="Colle ton code ici" aria-label="Code à restaurer"></textarea><button class="btn sm" data-restore>Restaurer</button><p class="hint" id="rsMsg" aria-live="polite"></p></details>
  </div>
  <div class="sec-h"><h2>Aide</h2></div>
  <div class="list"><button class="li plain" data-onbopen><span class="tx"><b>Revoir l'introduction</b></span>${ICON.chevR}</button></div>
  <p class="note">${ver}</p>`;
  RS_ARMED = false;
}
const bkData = () => { const d = {}; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (/^pv-/.test(k) && !/^pv-img:/.test(k) && !["pv-sync", "pv-photos", "pv-ana"].includes(k)) d[k] = localStorage.getItem(k); } return d; };
const bkEncode = d => "DEFROISSE1:" + btoa(unescape(encodeURIComponent(JSON.stringify(d))));
function bkDecode(txt){ const m = /DEFROISSE1:([A-Za-z0-9+/=\s]+)/.exec(txt || ""); if (!m) return null; try { const d = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/\s+/g, ""))))); return d && typeof d === "object" ? d : null; } catch(e){ return null; } }
function bkShow(){
  const out = $("#bkOut"), ta = $("#bkCode"), msg = $("#bkMsg"); if (!out) return;
  ta.value = bkEncode(bkData()); out.hidden = false;
  const fallback = () => { ta.focus(); ta.select(); msg.textContent = "Code sélectionné : copie-le et garde-le précieusement."; };
  try { navigator.clipboard.writeText(ta.value).then(() => { msg.textContent = "Code copié. Colle-le dans tes notes ou un message à toi-même."; }, fallback); } catch(e){ fallback(); }
}
function bkRestore(){
  const d = bkDecode(($("#bkIn") || {}).value), msg = $("#rsMsg");
  if (!d){ msg.textContent = "Ce code n'est pas reconnu. Vérifie qu'il est complet, en commençant par DEFROISSE1."; RS_ARMED = false; return; }
  if (hasData() && !RS_ARMED){ RS_ARMED = true; msg.textContent = "Ça remplacera la progression de ce téléphone. Touche encore Restaurer pour confirmer."; return; }
  Object.keys(bkData()).forEach(k => localStorage.removeItem(k));
  Object.keys(d).forEach(k => { if (/^pv-/.test(k)) localStorage.setItem(k, d[k]); });
  store.set("pv-onb", true); applyTS(); renderToday(); if (mounted.has("programme")) renderProgram(); renderReglages(); syncFavN();
  const dt = $(".restore"); if (dt) dt.open = true;
  const n = Object.values(store.get("pv-done", {})).reduce((a, x) => a + x.length, 0);
  const m2 = $("#rsMsg"); if (m2) m2.textContent = n ? `Sauvegarde restaurée : ${n} routine${n > 1 ? "s" : ""} cochée${n > 1 ? "s" : ""}, avec tes réglages.` : "Sauvegarde restaurée : date de départ et réglages récupérés.";
}

/* ---------- Matériel à préparer avant une routine ---------- */
function prepFor(R){
  const ids = R.steps.map(s => s.id), ts = ids.map(id => TECH[id]).filter(Boolean), out = ["Mains propres"];
  if (ts.some(T => /gant/i.test(T.huile || ""))) out.push("Gant nitrile");
  if (ts.some(T => /un peu|oui|huile|baume/i.test(T.huile || ""))) out.push("Huile de massage");
  if (ids.includes("gua-sha")) out.push("Gua sha");
  if (ids.includes("froid")) out.push("Deux cuillères froides");
  if (ts.some(T => T.cat === "tonif")) out.push("Un miroir");
  return out;
}

$$("[data-i]").forEach(el => { const s = ICON[el.dataset.i]; if (s) el.outerHTML = s; });
staticTabs();
syncFavN();
initNews();
showTab((location.hash || "").replace("#", "") || "aujourdhui");
onbMaybe();
