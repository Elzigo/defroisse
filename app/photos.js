/* ---------- Photos : séances, comparaison, montage, analyse ----------
   Les images restent sur l'appareil (IndexedDB). Seule l'analyse, à la demande, envoie deux photos à Claude
   quand l'app tourne dans claude.ai. */
const PH_VIEWS = [
  ["face", "Face", "Regarde l'objectif, visage neutre, dents desserrées, cheveux dégagés."],
  ["left", "Profil gauche", "Tourne la tête vers la droite pour montrer ton côté gauche, menton à l'horizontale."],
  ["right", "Profil droit", "Tourne la tête vers la gauche pour montrer ton côté droit, menton à l'horizontale."]
];
const PH_VNAME = Object.fromEntries(PH_VIEWS.map(v => [v[0], v[1]]));
const PH_CPS = [0, 28, 56, 84];
const PH_W = 900, PH_H = 1200;
const IN_APK = location.protocol === "file:";

/* Stockage des images */
const PDB = {
  _db: null, _bad: false, mode: "idb",
  _idb(){
    if (this._db) return Promise.resolve(this._db);
    if (this._bad) return Promise.resolve(null);
    return new Promise(res => {
      const fail = () => { this._bad = true; this.mode = "ls"; res(null); };
      const to = setTimeout(fail, 3000);
      try {
        const q = indexedDB.open("defroisse", 1);
        q.onupgradeneeded = () => q.result.createObjectStore("photos");
        q.onsuccess = () => { clearTimeout(to); this._db = q.result; res(this._db); };
        q.onerror = () => { clearTimeout(to); fail(); };
        q.onblocked = () => { clearTimeout(to); fail(); };
      } catch(e){ clearTimeout(to); fail(); }
    });
  },
  _tx(db, mode, fn){ return new Promise((res, rej) => { try { const tx = db.transaction("photos", mode), r = fn(tx.objectStore("photos")); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); } catch(e){ rej(e); } }); },
  _toData(b){ return new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = () => rej(f.error); f.readAsDataURL(b); }); },
  _fromData(d){ const [h, b64] = d.split(","), bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], {type: (h.match(/data:([^;]+)/) || [, "image/jpeg"])[1]}); },
  async put(k, v){
    const db = await this._idb();
    if (db){ try { await this._tx(db, "readwrite", s => s.put(v, k)); return; } catch(e){ this._bad = true; this.mode = "ls"; this._db = null; } }
    localStorage.setItem("pv-img:" + k, await this._toData(v));
  },
  async get(k){
    const db = await this._idb();
    if (db){ try { const r = await this._tx(db, "readonly", s => s.get(k)); if (r) return r; } catch(e){} }
    try { const d = localStorage.getItem("pv-img:" + k); return d ? this._fromData(d) : null; } catch(e){ return null; }
  },
  async del(k){
    const db = await this._idb();
    if (db){ try { await this._tx(db, "readwrite", s => s.delete(k)); } catch(e){} }
    try { localStorage.removeItem("pv-img:" + k); } catch(e){}
  }
};
const PHURL = new Map();
async function phUrl(k){
  if (PHURL.has(k)) return PHURL.get(k);
  const b = await PDB.get(k); if (!b) return null;
  const u = URL.createObjectURL(b); PHURL.set(k, u); return u;
}
function phForget(k){ const u = PHURL.get(k); if (u){ URL.revokeObjectURL(u); PHURL.delete(k); } }

const phSessions = () => store.get("pv-photos", []).filter(s => s && s.id && s.date).sort((a, b) => a.date.localeCompare(b.date) || (a.ts || 0) - (b.ts || 0));
const phDay = s => { const st = store.get("pv-start", null); return st ? Math.round((parseKey(s.date) - parseKey(st)) / 864e5) : null; };
const phDate = k => new Intl.DateTimeFormat("fr-FR", {day: "numeric", month: "short"}).format(parseKey(k));
const phLabel = s => { const d = phDay(s); return d === null ? phDate(s.date) : d <= 0 ? "Jour 0" : d % 7 === 0 ? `Semaine ${d / 7}` : `Jour ${d}`; };
const phViews = s => PH_VIEWS.map(v => v[0]).filter(v => s.views && s.views[v]);

/* Étapes photo du programme */
function phPlan(){
  const st = store.get("pv-start", null), ss = phSessions(), today = mid(new Date());
  const n = st ? Math.round((today - parseKey(st)) / 864e5) : null;
  const cps = PH_CPS.map(c => ({c, date: st ? addDays(parseKey(st), c) : null, done: ss.some(x => { const d = phDay(x); return d !== null && Math.abs(d - c) <= 3; })}));
  // sans aucune photo, la première séance sert de référence ; ensuite, une étape manquée depuis plus de 6 jours est sautée
  const next = !ss.length ? cps[0] : cps.find(x => !x.done && (n === null || x.c >= n - 6)) || null;
  return {st, n, cps, next, ss};
}
const phCpName = c => c === 0 ? "Jour 0" : `Semaine ${c / 7}`;

/* Onglet */
const PHC = {a: null, b: null, view: "face", mode: "slider", del: null};
async function renderPhotos(){
  const el = $("#phBody"); if (!el) return;
  const {st, n, cps, next, ss} = phPlan();
  // frise des quatre séances
  const steps = `<ol class="phsteps" aria-label="Séances photo du programme">${cps.map(x => `<li class="${x.done ? "done" : next && x.c === next.c ? "next" : n !== null && x.c < n - 6 && ss.length ? "miss" : ""}"><i></i><b>${phCpName(x.c)}</b><span>${x.date ? phDate(key(x.date)) : x.c === 0 ? "au départ" : `jour ${x.c}`}</span></li>`).join("")}</ol>`;
  let title, text;
  if (!ss.length){ title = "Tes photos du jour 0"; text = "Elles servent de référence pour la suite."; }
  else if (next && next.date && st){
    const dd = Math.round((next.date - mid(new Date())) / 864e5);
    title = `Prochaines photos : ${phCpName(next.c).toLowerCase()}`;
    const ld = fmtLong(next.date).toLowerCase();
    text = dd > 1 ? `Dans ${dd} jours, ${ld}.` : dd === 1 ? "Demain matin, avant ta routine." : dd === 0 ? "C'est aujourd'hui, avant ta routine du matin." : `Elles étaient prévues ${ld}. Prends-les dès que possible.`;
  } else if (next){ title = "Prochaines photos"; text = "Choisis ta date de départ dans le Programme pour caler les séances photo."; }
  else { title = "Les quatre séances sont faites"; text = "Tu peux continuer à ajouter des photos pour suivre l'entretien."; }
  const nextCard = `<div class="box phnext"><div class="phnext-t"><b>${title}</b><span>${text}</span></div>${steps}<button class="btn-full" data-phcam>${ICON.camera}Prendre mes photos</button><p class="hint">Le matin avant ta routine, même endroit, même lumière, sans flash.</p></div>`;

  // comparaison
  let cmp = "";
  if (ss.length >= 2){
    if (!PHC.a || !ss.find(s => s.id === PHC.a)) PHC.a = ss[0].id;
    if (!PHC.b || !ss.find(s => s.id === PHC.b) || PHC.b === PHC.a) PHC.b = ss[ss.length - 1].id === PHC.a ? ss[ss.length - 2].id : ss[ss.length - 1].id;
    const A = ss.find(s => s.id === PHC.a), B = ss.find(s => s.id === PHC.b);
    const common = phViews(A).filter(v => phViews(B).includes(v));
    if (!common.includes(PHC.view)) PHC.view = common[0] || "face";
    const gap = Math.abs(Math.round((parseKey(B.date) - parseKey(A.date)) / 864e5));
    const opt = sel => ss.map(s => `<option value="${s.id}" ${s.id === sel ? "selected" : ""}>${phLabel(s)}, ${phDate(s.date)}</option>`).join("");
    const span = Math.round((parseKey(ss[ss.length - 1].date) - parseKey(ss[0].date)) / 864e5);
    const ready = span >= 21;
    cmp = `<div class="sec-h"><h2>Avant, après</h2><span class="more">${gap} jour${gap > 1 ? "s" : ""} d'écart</span></div>
    <div class="box phcmp">
      <div class="phsel"><label><span>Avant</span><select id="phA" aria-label="Photo avant">${opt(PHC.a)}</select></label><label><span>Après</span><select id="phB" aria-label="Photo après">${opt(PHC.b)}</select></label></div>
      ${common.length > 1 ? `<div class="seg" role="radiogroup" aria-label="Vue">${common.map(v => `<button role="radio" aria-checked="${PHC.view === v}" data-phview="${v}">${PH_VNAME[v]}</button>`).join("")}</div>` : ""}
      <div class="phstage m-${PHC.mode}" id="phStage" style="--x:50%">
        <figure class="pa"><img id="phImgA" alt="Avant : ${esc(phLabel(A))}"><figcaption>${esc(phLabel(A))}, ${phDate(A.date)}</figcaption></figure>
        <figure class="pb"><img id="phImgB" alt="Après : ${esc(phLabel(B))}"><figcaption>${esc(phLabel(B))}, ${phDate(B.date)}</figcaption></figure>
        ${PHC.mode === "slider" ? `<i class="ph-handle" aria-hidden="true"></i><input type="range" class="ph-range" id="phRange" min="0" max="100" value="50" aria-label="Curseur entre avant et après">` : ""}
      </div>
      <div class="seg phmodes" role="radiogroup" aria-label="Affichage">${[["slider", "Curseur"], ["side", "Côte à côte"], ["fade", "Fondu"]].map(([k, l]) => `<button role="radio" aria-checked="${PHC.mode === k}" data-phmode="${k}">${l}</button>`).join("")}</div>
      <div class="phacts"><button class="btn sec sm" data-phreel>${ICON.play}Voir le montage</button>${phAiMaybe() ? `<button class="btn sm" data-phana>${ICON.sparkle}Analyser l'évolution</button>` : ""}</div>
      ${ready ? "" : `<p class="hint">Les changements se voient mieux à partir de trois semaines d'écart. Ton montage prendra tout son sens à la séance de la semaine 4.</p>`}
      <div id="phAna">${phAnaHTML(phAnaGet(A, B)) || (phAiMaybe() ? "" : `<p class="hint">L'analyse de l'évolution par l'IA se fait dans la version claude.ai de l'app, avec les mêmes photos.</p>`)}</div>
    </div>`;
  } else if (ss.length === 1){
    cmp = `<div class="box phwait"><b>La comparaison arrive à la prochaine séance</b><span>Avec deux séances, tu verras l'avant et l'après au curseur, le montage animé et l'analyse de l'évolution.</span></div>`;
  }

  // liste des séances
  const list = ss.length ? `<div class="sec-h"><h2>Tes séances</h2><span class="more">${ss.length}</span></div><div class="list phlist">${ss.slice().reverse().map(s => `<div class="li plain phrow">
      <div class="tx"><b>${esc(phLabel(s))}</b><span>${fmtLong(parseKey(s.date))}</span></div>
      <div class="phthumbs">${phViews(s).map(v => `<img data-phk="${s.id}:${v}:t" alt="${PH_VNAME[v]}">`).join("")}</div>
      ${PHC.del === s.id ? `<button class="btn sm danger" data-phdelok="${s.id}">Supprimer</button><button class="linkbtn" data-phdelno>Garder</button>` : `<button class="icon-btn sm" data-phdel="${s.id}" aria-label="Supprimer la séance ${esc(phLabel(s))}">${ICON.x}</button>`}
    </div>`).join("")}</div>` : "";

  el.innerHTML = (PH_FLASH ? `<p class="phalert" role="alert">${esc(PH_FLASH)}</p>` : "") + nextCard + cmp + list; PH_FLASH = "";
  phFill();
}
async function phFill(){
  for (const im of $$("img[data-phk]")){ const u = await phUrl(im.dataset.phk); if (u) im.src = u; else im.classList.add("missing"); }
  const A = $("#phImgA"), B = $("#phImgB");
  if (A && B){ const ua = await phUrl(`${PHC.a}:${PHC.view}`), ub = await phUrl(`${PHC.b}:${PHC.view}`); if (ua) A.src = ua; if (ub) B.src = ub; }
}

/* ---------- Prise de vue ---------- */
let CAM = null, PH_FLASH = "";
const CAM_ERRS = {NotAllowedError:"accès refusé par l'app ou le téléphone", PermissionDeniedError:"accès refusé par l'app ou le téléphone", NotFoundError:"aucune caméra trouvée", NotReadableError:"caméra déjà utilisée par une autre app", SecurityError:"bloquée par l'app", AbortError:"interrompue", OverconstrainedError:"réglages refusés"};
const camErr = e => (e && (CAM_ERRS[e.name] || e.name || e.message)) || "erreur inconnue";
function camOpen(){
  CAM = {sid: "s" + Date.now(), date: key(mid(new Date())), idx: 0, taken: {}, timer: store.get("pv-camt", 3), ghost: true, live: false, state: "opening", err: "", shot: null, msg: ""};
  let ov = $("#phCam");
  if (!ov){ ov = document.createElement("div"); ov.id = "phCam"; ov.className = "phcam"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Prendre mes photos"); document.body.appendChild(ov); }
  ov.hidden = false; document.body.style.overflow = "hidden";
  ov.innerHTML = `<div class="camtop"><button class="icon-btn glass" data-camx aria-label="Fermer">${ICON.x}</button><div class="camtitle"><b id="camT"></b><span id="camS"></span></div><span></span></div>
    <div class="camframe"><video id="camV" playsinline muted autoplay></video><img id="camG" class="camg" alt="" hidden><img id="camShot" class="camshot" alt="Photo prise" hidden>
      <svg class="camguide" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><ellipse cx="150" cy="185" rx="96" ry="128"/><line x1="54" y1="165" x2="246" y2="165"/><line x1="150" y1="40" x2="150" y2="330"/></svg>
      <div class="camwait" id="camWait">Ouverture de la caméra…</div>
      <div class="camcount" id="camCount" hidden aria-live="assertive"></div></div>
    <div class="camtip" id="camTip"></div>
    <div class="cambot" id="camBot"></div>
`;
  camRender(); camStart();
}
async function camStart(){
  const my = CAM; if (!my) return;
  my.state = "opening"; my.live = false; camRender();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ my.state = "off"; my.err = "caméra non proposée par cette app"; camRender(); return; }
  let settled = false;
  const to = setTimeout(() => { if (!settled && CAM === my && my.state === "opening"){ my.state = "off"; my.err = "la caméra ne répond pas"; camRender(); } }, 5000);
  try {
    const st = await navigator.mediaDevices.getUserMedia({video: {facingMode: "user", width: {ideal: 1440}, height: {ideal: 1920}}, audio: false});
    settled = true; clearTimeout(to);
    if (CAM !== my || my.shot){ st.getTracks().forEach(t => t.stop()); return; }
    my.stream = st; const v = $("#camV"); v.srcObject = st; await v.play().catch(() => {});
    my.live = true; my.state = "live"; my.err = ""; camRender();
  } catch(e){ settled = true; clearTimeout(to); if (CAM === my){ my.state = "off"; my.err = camErr(e); camRender(); } }
}
function CAM_STOP(s){ try { (s || (CAM && CAM.stream)).getTracks().forEach(t => t.stop()); } catch(e){} }
const fileBtn = (cls, icon, label, cap) => `<span class="${cls} filebtn">${ICON[icon]}${label}<input type="file" accept="image/*"${cap ? ' capture="user"' : ""} data-pick aria-label="${label}"></span>`;
const camPick = (cls, extra = "") => fileBtn(cls, "camera", "Prendre la photo", true) + fileBtn(cls + " sec", "file", "Choisir dans la galerie", false) + extra;
async function camRender(){
  if (!CAM) return;
  const [v, name, tip] = PH_VIEWS[CAM.idx], first = phSessions()[0];
  $("#camT").textContent = name; $("#camS").textContent = `Vue ${CAM.idx + 1} sur 3`;
  $("#camTip").textContent = CAM.msg || tip;
  $("#camTip").classList.toggle("err", !!CAM.msg);
  const g = $("#camG"), gu = first && first.views && first.views[v] ? await phUrl(`${first.id}:${v}`) : null;
  if (!CAM) return;
  g.hidden = !(gu && CAM.ghost && CAM.live && !CAM.shot); if (gu) g.src = gu;
  $("#camV").hidden = !CAM.live || !!CAM.shot;
  $(".camguide").style.display = CAM.live && !CAM.shot ? "" : "none";
  $("#camWait").hidden = CAM.state !== "opening" || !!CAM.shot;
  $(".camframe").style.display = CAM.live || CAM.shot || CAM.state === "opening" ? "" : "none";
  const sh = $("#camShot"); sh.hidden = !CAM.shot; if (CAM.shot) sh.src = CAM.shot.url;
  const skip = CAM.idx > 0 ? `<button class="linkbtn camskip" data-camskip>Passer cette vue</button>` : "";
  const bot = $("#camBot");
  if (CAM.shot){
    bot.innerHTML = `<button class="btn sec" data-camretake>Reprendre</button><button class="btn" data-camkeep>${ICON.check}Garder</button>`;
  } else if (CAM.live){
    bot.innerHTML = `<button class="camchip" data-camtimer aria-label="Retardateur">${ICON.clock}${CAM.timer ? CAM.timer + " s" : "Sans"}</button>
      <button class="camshutter" data-camshoot aria-label="Prendre la photo"><i></i></button>
      ${fileBtn("camchip", "file", "Galerie", false)}
      ${gu ? `<button class="camchip ghost" data-camghost aria-pressed="${CAM.ghost}">Calque</button>` : ""}${skip}`;
  } else if (CAM.state === "opening"){
    bot.innerHTML = camPick("btn", skip);
  } else {
    bot.innerHTML = `<p class="camnolive">Ici, l'app ne peut pas filmer directement. Prends la photo avec l'appareil photo du téléphone, ou choisis-la dans ta galerie.</p>${camPick("btn", skip)}${CAM.noPicker ? `<div class="camhelp"><b>L'app Claude n'ouvre pas l'appareil photo.</b><span>Ouvre cette page dans Chrome : bouton de partage en haut à droite, copie le lien, puis colle-le dans Chrome. Là, ces boutons marchent.</span></div>` : ""}<p class="camdiag">Caméra directe : ${esc(CAM.err)}</p>`;
  }
}
function camCrop(src, sw, sh, mirror){
  const c = document.createElement("canvas"); c.width = PH_W; c.height = PH_H;
  const x = c.getContext("2d"), r = PH_W / PH_H;
  let cw = sw, ch = sw / r; if (ch > sh){ ch = sh; cw = sh * r; }
  const sx = (sw - cw) / 2, sy = (sh - ch) / 2;
  if (mirror){ x.translate(PH_W, 0); x.scale(-1, 1); }
  x.drawImage(src, sx, sy, cw, ch, 0, 0, PH_W, PH_H);
  return new Promise(res => c.toBlob(b => res(b), "image/jpeg", .86));
}
async function camShoot(){
  if (!CAM || !CAM.live) return;
  const n = CAM.timer, cnt = $("#camCount");
  for (let i = n; i > 0; i--){ cnt.hidden = false; cnt.textContent = i; await new Promise(r => setTimeout(r, 1000)); if (!CAM) return; }
  cnt.hidden = true;
  const v = $("#camV"); if (!v.videoWidth) return;
  const b = await camCrop(v, v.videoWidth, v.videoHeight, false);
  try { navigator.vibrate && navigator.vibrate(15); } catch(e){}
  CAM.shot = {blob: b, url: URL.createObjectURL(b)}; camRender();
}
async function camImport(file){
  if (!CAM || !file) return;
  CAM.msg = "";
  let src = null, w = 0, h = 0, url = null;
  try {
    if (window.createImageBitmap){ src = await createImageBitmap(file); w = src.width; h = src.height; }
  } catch(e){ src = null; }
  if (!src){
    url = URL.createObjectURL(file); const im = new Image(); im.src = url;
    try { await im.decode(); src = im; w = im.naturalWidth; h = im.naturalHeight; } catch(e){ URL.revokeObjectURL(url); CAM.msg = "Cette photo n'a pas pu être lue. Essaie une autre photo, au format JPEG."; camRender(); return; }
  }
  const b = await camCrop(src, w, h, false); if (url) URL.revokeObjectURL(url);
  if (!CAM) return;
  if (!b){ CAM.msg = "Cette photo n'a pas pu être préparée. Réessaie."; camRender(); return; }
  CAM.shot = {blob: b, url: URL.createObjectURL(b)}; camRender();
}
async function camKeep(){
  if (!CAM || !CAM.shot) return;
  CAM.taken[PH_VIEWS[CAM.idx][0]] = CAM.shot.blob; CAM.shot = null;
  if (CAM.idx < PH_VIEWS.length - 1){ CAM.idx++; camRender(); } else await camFinish();
}
async function camThumb(blob){
  const url = URL.createObjectURL(blob), im = new Image(); im.src = url; await im.decode();
  const c = document.createElement("canvas"); c.width = 240; c.height = 320; c.getContext("2d").drawImage(im, 0, 0, 240, 320); URL.revokeObjectURL(url);
  return new Promise(res => c.toBlob(b => res(b), "image/jpeg", .72));
}
async function camFinish(){
  const C = CAM; if (!C) return;
  const views = Object.keys(C.taken);
  if (views.length){
    try {
      for (const v of views){ await PDB.put(`${C.sid}:${v}`, C.taken[v]); await PDB.put(`${C.sid}:${v}:t`, await camThumb(C.taken[v])); }
      const all = store.get("pv-photos", []); all.push({id: C.sid, date: C.date, ts: Date.now(), views: Object.fromEntries(views.map(v => [v, true]))}); store.set("pv-photos", all);
      const ss = phSessions(); PHC.a = ss[0].id; PHC.b = C.sid;
    } catch(e){ PH_FLASH = /quota/i.test(camErr(e)) ? "Plus assez de place pour enregistrer ces photos dans l'app. Supprime une ancienne séance." : `Les photos n'ont pas pu être enregistrées (${camErr(e)}).`; }
  }
  camClose(true);
}
function camClose(saved){
  if (!CAM) return;
  const hadShots = Object.keys(CAM.taken).length;
  if (!saved && hadShots){ camFinish(); return; }
  CAM_STOP(); if (CAM.shot) URL.revokeObjectURL(CAM.shot.url); CAM = null;
  const ov = $("#phCam"); if (ov){ ov.hidden = true; ov.innerHTML = ""; }
  document.body.style.overflow = "";
  if (CURTAB === "photos") renderPhotos(); else renderToday();
}
function alertBox(msg){ const el = $("#phBody"); if (el) el.insertAdjacentHTML("afterbegin", `<p class="phalert" role="alert">${esc(msg)}</p>`); }

/* ---------- Montage ---------- */
let REEL = null;
async function reelOpen(){
  const ss = phSessions().filter(s => s.views && s.views[PHC.view]); if (ss.length < 2) return;
  let ov = $("#phReel");
  if (!ov){ ov = document.createElement("div"); ov.id = "phReel"; ov.className = "phreel"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Montage de tes photos"); document.body.appendChild(ov); }
  const urls = []; for (const s of ss) urls.push(await phUrl(`${s.id}:${PHC.view}`));
  ov.innerHTML = `<div class="rl-top"><button class="icon-btn glass" data-reelx aria-label="Fermer">${ICON.x}</button><span class="rl-v">${PH_VNAME[PHC.view]}</span><span></span></div>
    <div class="rl-stage">${ss.map((s, i) => `<img class="${i === 0 ? "on" : ""}" src="${urls[i] || ""}" alt="${esc(phLabel(s))}">`).join("")}</div>
    <div class="rl-cap"><b id="rlT">${esc(phLabel(ss[0]))}</b><span id="rlD">${fmtLong(parseKey(ss[0].date))}</span></div>
    <div class="rl-bar">${ss.map((s, i) => `<i class="${i === 0 ? "on" : ""}"></i>`).join("")}</div>
    <div class="rl-acts"><button class="btn sec" data-reelsave>${ICON.file}${IN_APK ? "Afficher l'image" : "Enregistrer l'image"}</button></div>`;
  ov.hidden = false; document.body.style.overflow = "hidden";
  let i = 0; clearInterval(REEL);
  REEL = setInterval(() => {
    const imgs = $$("#phReel .rl-stage img"), bars = $$("#phReel .rl-bar i"); if (!imgs.length){ clearInterval(REEL); return; }
    i = (i + 1) % imgs.length;
    imgs.forEach((im, k) => im.classList.toggle("on", k === i)); bars.forEach((b, k) => b.classList.toggle("on", k <= i));
    $("#rlT").textContent = phLabel(ss[i]); $("#rlD").textContent = fmtLong(parseKey(ss[i].date));
  }, 1900);
}
function reelClose(){ clearInterval(REEL); REEL = null; const ov = $("#phReel"); if (ov){ ov.hidden = true; ov.innerHTML = ""; } document.body.style.overflow = ""; }
async function reelCompose(){
  const ss = phSessions().filter(s => s.views && s.views[PHC.view]); if (ss.length < 2) return null;
  const A = ss[0], B = ss[ss.length - 1];
  const load = async k => { const u = await phUrl(k); const im = new Image(); im.src = u; await im.decode(); return im; };
  const ia = await load(`${A.id}:${PHC.view}`), ib = await load(`${B.id}:${PHC.view}`);
  const W = 1600, H = 1240, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  x.fillStyle = "#F2F1EE"; x.fillRect(0, 0, W, H);
  const pw = 720, ph = 960, top = 120;
  x.drawImage(ia, 60, top, pw, ph); x.drawImage(ib, W - 60 - pw, top, pw, ph);
  x.strokeStyle = "rgba(31,31,36,.14)"; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2, 60); x.lineTo(W / 2, H - 60); x.stroke();
  x.fillStyle = "#1F1F24"; x.font = "500 34px Manrope, sans-serif"; x.textBaseline = "alphabetic";
  x.fillText(phLabel(A), 60, top + ph + 56); x.fillText(phLabel(B), W - 60 - pw, top + ph + 56);
  x.fillStyle = "#6B6B73"; x.font = "400 26px Manrope, sans-serif";
  x.fillText(fmtLong(parseKey(A.date)), 60, top + ph + 96); x.fillText(fmtLong(parseKey(B.date)), W - 60 - pw, top + ph + 96);
  x.fillStyle = "#2B1630"; x.font = "600 34px Manrope, sans-serif"; x.fillText("défroisse", 60, 78);
  x.fillStyle = "#6B6B73"; x.font = "400 26px Manrope, sans-serif"; const gap = Math.round((parseKey(B.date) - parseKey(A.date)) / 864e5);
  const t = `${PH_VNAME[PHC.view]}, ${gap} jours d'écart`; x.fillText(t, W - 60 - x.measureText(t).width, 78);
  return new Promise(res => c.toBlob(b => res(b), "image/jpeg", .9));
}
async function reelSave(){
  const b = await reelCompose(); if (!b) return;
  const name = `defroisse-avant-apres-${key(mid(new Date()))}.jpg`;
  try {
    const d = window.claude && typeof window.claude.use === "function" ? await window.claude.use("downloads") : null;
    if (d){ await d.save({filename: name, data: b}); return; }
  } catch(e){ if (e && e.code === "declined") return; }
  if (IN_APK){
    const u = URL.createObjectURL(b), ov = $("#phReel");
    if (ov) ov.insertAdjacentHTML("beforeend", `<div class="rl-img" data-rlimgx><img src="${u}" alt="Avant, après"><p>Fais une capture d'écran pour garder l'image, puis touche pour fermer.</p></div>`);
    return;
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

/* ---------- Analyse par l'IA (claude.ai) ---------- */
let PH_SAMPLE, PH_MAX = 2, PH_NOAI = false;
const phAiMaybe = () => !PH_NOAI && PH_SAMPLE !== null && !!(window.claude && typeof window.claude.use === "function");
async function phSample(){
  if (PH_SAMPLE !== undefined) return PH_SAMPLE;
  try { const c = window.claude; PH_SAMPLE = c && typeof c.use === "function" ? await c.use("sample") : null; } catch(e){ PH_SAMPLE = null; }
  if (PH_SAMPLE){ try { const lim = await PH_SAMPLE.limits(); if (!lim || !lim.images) PH_SAMPLE = null; else PH_MAX = lim.images.maxCount || 2; } catch(e){ PH_SAMPLE = null; } }
  return PH_SAMPLE;
}
const phPair = (A, B) => `${A.id}>${B.id}`;
const phAnaGet = (A, B) => (store.get("pv-ana", {})[phPair(A, B)] || null);
const PH_VD = {plus_lisse: ["Plus lisse", "up"], stable: ["Stable", "eq"], plus_marque: ["Plus marqué", "down"], indetermine: ["Impossible à dire", "na"]};
function phAnaHTML(a){
  if (!a || !a.data) return "";
  const d = a.data, z = Array.isArray(d.zones) ? d.zones : [];
  const conf = {faible: "faible", moyenne: "moyenne", bonne: "bonne"}[d.confiance] || "faible";
  return `<div class="ana">
    <div class="ana-h"><b>Analyse de l'évolution</b><span class="conf c-${conf}">Confiance ${conf}</span></div>
    ${d.synthese ? `<p class="ana-s">${esc(d.synthese)}</p>` : ""}
    ${d.conditions ? `<p class="ana-c ${d.comparable === "oui" ? "" : "warn"}">${ICON.info}<span>${esc(d.conditions)}</span></p>` : ""}
    <ul class="ana-z">${z.map(x => { const v = PH_VD[x.verdict] || PH_VD.indetermine; return `<li><div><b>${esc(x.zone || "")}</b>${x.detail ? `<span>${esc(x.detail)}</span>` : ""}</div><em class="vd v-${v[1]}">${v[0]}</em></li>`; }).join("")}</ul>
    ${d.conseil_photo ? `<p class="hint">${esc(d.conseil_photo)}</p>` : ""}
    <p class="note">Analyse du ${phDate(key(new Date(a.ts)))}.</p>
  </div>`;
}
let PH_CTL = null;
async function phAnalyze(){
  const out = $("#phAna"); if (!out) return;
  const ss = phSessions(), A = ss.find(s => s.id === PHC.a), B = ss.find(s => s.id === PHC.b); if (!A || !B) return;
  const s = await phSample();
  if (!s){ const b = $("[data-phana]"); if (b) b.remove(); out.innerHTML = `<p class="hint">L'analyse de l'évolution par l'IA se fait dans la version claude.ai de l'app, avec les mêmes photos.</p>`; return; }
  const [early, late] = parseKey(A.date) <= parseKey(B.date) ? [A, B] : [B, A];
  const common = phViews(early).filter(v => phViews(late).includes(v)).slice(0, Math.max(1, Math.floor(PH_MAX / 2)));
  const imgs = []; for (const v of common){ imgs.push(await PDB.get(`${early.id}:${v}`), await PDB.get(`${late.id}:${v}`)); }
  if (imgs.some(x => !x)){ out.innerHTML = `<p class="hint">Certaines photos sont introuvables sur ce téléphone.</p>`; return; }
  const gap = Math.round((parseKey(late.date) - parseKey(early.date)) / 864e5);
  const order = common.map((v, i) => `image ${2 * i + 1} : ${PH_VNAME[v].toLowerCase()} AVANT (${phDate(early.date)}), image ${2 * i + 2} : ${PH_VNAME[v].toLowerCase()} APRÈS (${phDate(late.date)})`).join(" ; ");
  const prompt = `Tu compares des photos du même visage prises à ${gap} jours d'intervalle, pendant un programme de massages du visage (drainage, relâchement musculaire, exercices). Ordre des images : ${order}.
Règles :
- Sois honnête et prudent. Ne flatte pas, n'invente pas d'amélioration. Sur quelques semaines, les changements réels sont souvent faibles.
- La lumière, l'angle, la distance, l'expression et le gonflement (heure de la journée, sommeil, sel) créent de fausses différences. Décris ce qui diffère dans la prise de vue et baisse ta confiance en conséquence.
- Aucun diagnostic médical. Si une zone n'est pas visible ou pas comparable, réponds "indetermine".
- Rédige en français simple, en tutoyant la personne, phrases courtes.
Réponds uniquement avec ce JSON :
{"comparable": "oui" | "partiellement" | "non",
 "conditions": "une phrase sur ce qui diffère entre les prises de vue (lumière, angle, distance, expression)",
 "zones": [{"zone": "Sillons nasogéniens", "verdict": "plus_lisse" | "stable" | "plus_marque" | "indetermine", "detail": "une phrase"}],
 "synthese": "deux phrases au plus",
 "confiance": "faible" | "moyenne" | "bonne",
 "conseil_photo": "une phrase pour mieux prendre la prochaine photo"}
Les zones, dans cet ordre : Sillons nasogéniens, Coins de la bouche, Ovale et mâchoire, Gonflement et cernes, Front et entre les sourcils, Symétrie du visage.`;
  out.innerHTML = `<div class="ana"><p class="ana-s thinking">Claude regarde les photos…</p><p class="hint">Les photos sont envoyées à Claude depuis ton compte, le temps de l'analyse. Cela prend en général moins d'une minute.</p><button class="linkbtn" data-phstop>Arrêter</button></div>`;
  PH_CTL = new AbortController();
  try {
    const data = await s.json(prompt, {images: imgs, signal: PH_CTL.signal, modelTier: "complex"});
    if (!data || !Array.isArray(data.zones)) throw {code: "invalid_json"};
    const all = store.get("pv-ana", {}); all[phPair(A, B)] = {ts: Date.now(), data}; store.set("pv-ana", all);
    out.innerHTML = phAnaHTML(all[phPair(A, B)]);
  } catch(e){
    const c = e && e.code;
    if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed", "images_unavailable"].includes(c)){ PH_NOAI = true; const b = $("[data-phana]"); if (b) b.remove(); }
    const msg = c === "cancelled" ? "" : PH_NOAI ? "L'analyse par l'IA n'est pas disponible ici. Le curseur et le montage restent là pour comparer." : c === "rate_limited" ? "Trop de demandes pour l'instant. Réessaie dans un moment." : c === "session_expired" ? "Reconnecte-toi à claude.ai, puis réessaie." : c === "refused" ? "Claude n'a pas pu analyser ces photos. Essaie avec une autre paire de séances." : c === "image_rejected" ? "Une des photos n'a pas été acceptée. Reprends-la à la prochaine séance." : "L'analyse n'a pas abouti. Tu peux réessayer.";
    out.innerHTML = msg ? `<div class="ana"><p class="ana-s">${msg}</p></div>` : "";
  } finally { PH_CTL = null; }
}

/* ---------- Invitation le jour des photos ---------- */
function photoNudgeHTML(){
  const {st, n, next, ss} = phPlan();
  if (!st || !next || n === null || n < 0) return "";
  const ref = !ss.length, dd = next.c - n;
  if (!ref && (dd > 0 || dd < -6)) return "";
  return `<button class="nudge" data-phcam><span class="ic">${ICON.camera}</span><span class="tx"><b>${ref ? "Tes photos de référence" : `Tes photos de la ${phCpName(next.c).toLowerCase()}`}</b><span>Trois photos, avant ta routine du matin.</span></span>${ICON.chevR}</button>`;
}

/* ---------- Événements ---------- */
function photosClick(t){
  if (t.hasAttribute("data-phcam")){ camOpen(); return true; }
  if (t.hasAttribute("data-camx")){ camClose(false); return true; }
  if (t.hasAttribute("data-camshoot")){ camShoot(); return true; }
  if (t.hasAttribute("data-camretake")){ if (CAM && CAM.shot){ URL.revokeObjectURL(CAM.shot.url); CAM.shot = null; if (!CAM.live && CAM.state !== "off") camStart(); else camRender(); } return true; }
  if (t.hasAttribute("data-camkeep")){ camKeep(); return true; }
  if (t.hasAttribute("data-camskip")){ if (CAM){ CAM.shot = null; if (CAM.idx < PH_VIEWS.length - 1){ CAM.idx++; camRender(); } else camFinish(); } return true; }
  if (t.hasAttribute("data-camtimer")){ if (CAM){ CAM.timer = CAM.timer === 3 ? 10 : CAM.timer === 10 ? 0 : 3; store.set("pv-camt", CAM.timer); camRender(); } return true; }
  if (t.hasAttribute("data-camghost")){ if (CAM){ CAM.ghost = !CAM.ghost; camRender(); } return true; }
  if (t.dataset.phview){ PHC.view = t.dataset.phview; renderPhotos(); return true; }
  if (t.dataset.phmode){ PHC.mode = t.dataset.phmode; renderPhotos(); return true; }
  if (t.hasAttribute("data-phreel")){ reelOpen(); return true; }
  if (t.hasAttribute("data-reelx")){ reelClose(); return true; }
  if (t.hasAttribute("data-reelsave")){ reelSave(); return true; }
  if (t.hasAttribute("data-phana")){
    if (store.get("pv-anaok", false)) phAnalyze();
    else { const out = $("#phAna"); if (out) out.innerHTML = `<div class="ana"><p class="ana-c">${ICON.lock}<span>Pour l'analyse, les photos des deux séances comparées sont envoyées à Claude depuis ton compte claude.ai. Elles restent par ailleurs uniquement sur ce téléphone.</span></p><div class="phacts"><button class="btn sm" data-phanago>Analyser</button><button class="btn sec sm" data-phanano>Annuler</button></div></div>`; }
    return true;
  }
  if (t.hasAttribute("data-phanago")){ store.set("pv-anaok", true); phAnalyze(); return true; }
  if (t.hasAttribute("data-phanano")){ const out = $("#phAna"); if (out) out.innerHTML = ""; return true; }
  if (t.hasAttribute("data-phstop")){ if (PH_CTL) PH_CTL.abort(); return true; }
  if (t.dataset.phdel){ PHC.del = t.dataset.phdel; renderPhotos(); return true; }
  if (t.hasAttribute("data-phdelno")){ PHC.del = null; renderPhotos(); return true; }
  if (t.dataset.phdelok){
    const id = t.dataset.phdelok, all = store.get("pv-photos", []), s = all.find(x => x.id === id);
    if (s) PH_VIEWS.forEach(([v]) => { PDB.del(`${id}:${v}`); PDB.del(`${id}:${v}:t`); phForget(`${id}:${v}`); phForget(`${id}:${v}:t`); });
    store.set("pv-photos", all.filter(x => x.id !== id)); PHC.del = null; renderPhotos(); return true;
  }
  return false;
}
document.addEventListener("click", e => { const r = e.target.closest("[data-rlimgx]"); if (r) r.remove(); });
/* Sur téléphone, si le sélecteur ne s'ouvre pas (l'app hôte ne le permet pas), on le dit au lieu de rester muet */
const PICK = {done: false, t: 0};
const pickAway = () => { PICK.done = true; };
window.addEventListener("blur", pickAway); window.addEventListener("pagehide", pickAway);
document.addEventListener("visibilitychange", () => { if (document.hidden) pickAway(); });
document.addEventListener("click", e => {
  const inp = e.target.closest && e.target.closest("input[data-pick]"); if (!inp || !CAM) return;
  PICK.done = false; PICK.t = Date.now();
  if (!matchMedia("(pointer: coarse)").matches) return;
  const my = CAM;
  setTimeout(() => { if (!PICK.done && CAM === my && !my.shot && !my.noPicker){ my.noPicker = true; my.state = my.live ? my.state : "off"; camRender(); } }, 2500);
}, true);
document.addEventListener("change", e => {
  if (e.target.hasAttribute && e.target.hasAttribute("data-pick")){ PICK.done = true; if (e.target.files && e.target.files[0]){ const f = e.target.files[0]; e.target.value = ""; camImport(f); } }
  if (e.target.id === "phA"){ PHC.a = e.target.value; renderPhotos(); }
  if (e.target.id === "phB"){ PHC.b = e.target.value; renderPhotos(); }
});
document.addEventListener("input", e => { if (e.target.id === "phRange"){ const st = $("#phStage"); if (st) st.style.setProperty("--x", e.target.value + "%"); } });
document.addEventListener("visibilitychange", () => { if (document.hidden && CAM && CAM.live){ CAM_STOP(); CAM.live = false; } else if (!document.hidden && CAM && !CAM.live && !CAM.shot && CAM.state === "live"){ camStart(); } });
