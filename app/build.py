import re
head=open('head.html').read()
_BUMP={9.5:10.5,10:11,10.5:11.5,11:12,11.5:12.5,12:13}
def _fs(v):
    v=float(v); v=_BUMP.get(v,v)
    return f'calc({v:g}px * var(--ts))' if v<=19 else f'{v:g}px'
head=re.sub(r'font-size:\s*([\d.]+)px', lambda m:'font-size:'+_fs(m.group(1)), head)
head=re.sub(r'(font:\s*(?:italic\s+|normal\s+)?(?:\d{3}\s+)?)([\d.]+)px', lambda m:m.group(1)+_fs(m.group(2)), head)
import base64 as _b64
_logo=open('brand/defroisse-logo.svg').read().strip()
_WM='brand/wordmark/A-fredoka/'
head=head.replace('__WORDMARK_W__','"data:image/svg+xml;base64,'+_b64.b64encode(open(_WM+'defroisse-texte-blanc.svg').read().strip().encode()).decode()+'"')
head=head.replace('__WORDMARK__','"data:image/svg+xml;base64,'+_b64.b64encode(open(_WM+'defroisse-texte.svg').read().strip().encode()).decode()+'"')
head=head.replace('__LOGO__','"data:image/svg+xml;base64,'+_b64.b64encode(_logo.encode()).decode()+'"')
def _cat_svg(svg):
    """Le logo, avec des repères pour l'animation : rides, ombre terne, oeil fermé, rouleau, étincelles."""
    import re as _r
    svg=_r.sub(r'id="(\w+)"', r'id="k\1"', svg).replace('url(#','url(#k')
    svg=svg.replace('<svg xmlns','<svg aria-hidden="true" xmlns',1)
    wr={'M84 160':'0.55s','M70 70':'0.95s','M61 82':'1.05s','M70 111':'1.15s','M67 125':'1.3s','M47 118':'1.6s'}
    for d,dl in wr.items():
        k=svg.index('<path d="'+d); svg=svg[:k]+'<path class="wr" style="--d:'+dl+'" d="'+d+svg[k+len('<path d="'+d):]
    svg=svg.replace('<g clip-path="url(#kcHead)">','<g class="dull" clip-path="url(#kcHead)">',1)
    k=svg.index('<path d="M64 104 L88 109"'); svg=svg[:k]+'<path class="wink" d="M64 104 L88 109"'+svg[k+len('<path d="M64 104 L88 109"'):]
    extra=('<ellipse class="glowL" cx="74" cy="98" rx="32" ry="28" fill="url(#kgGlow)"/>'
           '<ellipse class="blushL" cx="64" cy="123" rx="14" ry="10" fill="url(#kgBlush)"/>'
           '<g class="eyeL"><rect x="70" y="94" width="12" height="25" rx="6" fill="#FFFFFF" opacity="0.97" transform="rotate(8 76 107)"/></g>')
    k=svg.index('<rect x="116" y="94"'); svg=svg[:k]+extra+svg[k:]
    sp=lambda x,y,r,d: f'<path class="spk2" style="--d:{d}" d="M{x} {y-r} Q{x} {y} {x+r} {y} Q{x} {y} {x} {y+r} Q{x} {y} {x-r} {y} Q{x} {y} {x} {y-r} Z" fill="#FFFFFF"/>'
    svg=svg.replace('<g transform="translate(150 130) rotate(28)">', sp(66,58,8,'2.15s')+sp(46,92,5,'2.3s')+sp(158,150,6,'2.4s')+'<g class="roll"><g transform="translate(150 130) rotate(28)">',1)
    assert svg.endswith('</g></svg>'); svg=svg[:-len('</svg>')]+'</g></svg>'
    return svg
_CAT=_cat_svg(_logo)
body1=open('body1.html').read()
import datetime as _dt
_now=_dt.datetime.utcnow()+_dt.timedelta(hours=4)
_mois=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"]
_ver=f"{'1er' if _now.day==1 else _now.day} {_mois[_now.month-1]} {_now.year}, {_now.hour} h {_now.minute:02d}"
assert body1.count('restent sur cet appareil.')==1
body1=body1.replace('restent sur cet appareil.','restent sur cet appareil. <span class="ver">Version du '+_ver+'.</span>')
p=open('panels.html').read()
# sous-pages d'Apprendre : en-tête avec retour, grand titre, sous-titre
SUB = {
  "comprendre":"Ton visage",
  "symetrie":"Symétrie",
  "habitudes":"Habitudes",
}
import re as _re
def _hdr(m):
    cls, pid = m.group(1), m.group(2)
    t = SUB[pid]
    return (f'<section class="{cls} sub" id="p-{pid}" role="tabpanel" hidden>\n'
            f'  <header class="subhead"><button class="icon-btn" data-tab="apprendre" aria-label="Retour à Apprendre"><i data-i="chevL"></i></button><span>Apprendre</span></header>\n'
            f'  <h1 class="title">{t}</h1>\n')
p=_re.sub(r'<section class="(panel(?: srcs)?)" id="p-(\w+)" role="tabpanel" hidden>\n', _hdr, p)
p=p.replace('<div class="mapbox"><div class="illo" id="lymphMap"></div></div>','<div class="mapbox" id="lymphMap"></div>')
assert p.count('class="subhead"')==3, p.count('class="subhead"')
p=p.replace('</a> · <a','</a>, <a').replace(' · ',' ; ')
tech_fix=lambda t: t.replace(' · ',', ').replace('huile:"—"','huile:"Aucun"')
prelude='''
const CATS = {
  drainage:{nom:"Drainage", color:"var(--drain)"},
  relachement:{nom:"Relâchement", color:"var(--release)"},
  tonif:{nom:"Tonification", color:"var(--tone)"},
  posture:{nom:"Posture", color:"var(--posture)"},
  outil:{nom:"Outils", color:"var(--tool)"}
};
const PRESSION = [
  {nom:"Sans appui", txt:"Exercice : la main ne fait que vérifier."},
  {nom:"Effleurage", txt:"Tu déplaces seulement la peau, avec le poids d'une pièce de monnaie."},
  {nom:"Légère", txt:"La peau glisse sur ce qui est dessous, sans aucune gêne."},
  {nom:"Modérée", txt:"Tu sens le muscle sous les doigts. Gêne de 3 à 4 sur 10."},
  {nom:"Tenue profonde", txt:"Appui fixe de 30 à 90 s. Gêne de 5 sur 10 au maximum, qui doit baisser pendant la tenue."}
];
const PREUVE = [null,
  "Modèle de praticien, pas encore testé",
  "Mécanisme mesuré dans un autre contexte, ou anatomie établie",
  "Mesuré chez l'humain, sans groupe contrôle ou par observation",
  "Essai randomisé sur le visage"];
'''
import json as _json
_o=_json.load(open('content/outils.json'))
for _it in _o['items']:
    if _it['id'] in ('guasha','rouleau'): _it['preuve']=4
learn='const NEWS_LOCAL = '+_json.dumps(_json.load(open('content/news.json'))['news'] if isinstance(_json.load(open('content/news.json')),dict) else _json.load(open('content/news.json')),ensure_ascii=False)+';\n'+'const ALIM = '+_json.dumps(_json.load(open('content/alim.json')),ensure_ascii=False)+';\nconst SOINS = '+_json.dumps(_json.load(open('content/soins.json')),ensure_ascii=False)+';\nconst OUTILS = '+_json.dumps(_o,ensure_ascii=False)+';\n'
tech=tech_fix(open('tech.js').read()+open('tech_rides.js').read()); data=open('data.js').read().replace(' · ',', ').replace(',"—",',',"Aucune",'); app='const CAT_SVG = '+_json.dumps(_CAT,ensure_ascii=False)+';\n'+open('app.js').read()
_anc='$$("[data-i]").forEach(el =>'; assert app.count(_anc)==1
app=app.replace(_anc, open('photos.js').read()+'\n'+_anc)
foot='''</main>
<nav class="tabbar" role="tablist" aria-label="Navigation principale">
  <button class="tab" role="tab" data-tab="aujourdhui" aria-label="Aujourd'hui"><i data-i="home"></i><span>Aujourd'hui</span></button>
  <button class="tab" role="tab" data-tab="gestes" aria-label="Gestes"><i data-i="search"></i><span>Gestes</span></button>
  <button class="tab" role="tab" data-tab="photos" aria-label="Photos"><i data-i="camera"></i><span>Photos</span></button>
  <button class="tab" role="tab" data-tab="apprendre" aria-label="Apprendre"><i data-i="book"></i><span>Apprendre</span></button>
</nav>
</div>
<div class="overlay" id="ov" hidden role="dialog" aria-modal="true" aria-label="Geste"><div id="ovIn"></div></div>
'''
html=head+body1+p+foot+'<script>'+prelude+tech+data+learn+app+'</script>\n'
open('index.html','w').write(html)
js=prelude+tech+data+learn+app
open('check.js','w').write(js)
print(len(html))
