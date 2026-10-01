#!/usr/bin/env python3
"""Construit Défroisse à partir des sources de app/.

  python3 tools/build.py site
      Version en ligne dans _site/ : l'app, ses médias, ses polices, le manifeste
      et le service worker qui garde l'app hors connexion et récupère chaque mise à jour.

  python3 tools/build.py apk --remote https://<compte>.github.io/<depot>/ --version-code 5 \\
                             --keystore chemin/visage-release.jks --kspass <mot de passe>
      App Android dans out/Defroisse.apk. Au lancement, elle ouvre la version en ligne
      (donc toujours à jour) et garde une copie intégrée pour fonctionner sans réseau.
      Demande Java 17 ; apktool et uber-apk-signer sont téléchargés au besoin (versions figées).

  python3 tools/build.py app
      Seulement app/index.html (la page publiée aussi comme artifact sur claude.ai).
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
ANDROID = os.path.join(ROOT, "android")
PROJ = os.path.join(ANDROID, "proj")
TOOLS = os.path.join(ROOT, "tools")
BIN = os.path.join(TOOLS, "bin")
SITE = os.path.join(ROOT, "_site")
OUT = os.path.join(ROOT, "out")

JARS = {
    "apktool.jar": ("https://github.com/iBotPeaches/Apktool/releases/download/v2.11.1/apktool_2.11.1.jar",
                    "56d59c524fc764263ba8d345754d8daf55b1887818b15cd3b594f555d249e2db"),
    "uber-apk-signer.jar": ("https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar",
                            "e1299fd6fcf4da527dd53735b56127e8ea922a321128123b9c32d619bba1d835"),
}

FONTS_CSS = """<style>
@font-face{font-family:"Manrope";src:url(fonts/Manrope.woff2) format("woff2");font-weight:200 800;font-display:swap}
@font-face{font-family:"Manrope";src:url(fonts/Manrope-ext.woff2) format("woff2");font-weight:200 800;font-display:swap;unicode-range:U+0100-02AF,U+1E00-1EFF,U+2020,U+20A0-20AB,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:"Newsreader";src:url(fonts/Newsreader.woff2) format("woff2");font-weight:200 800;font-display:swap}
@font-face{font-family:"Newsreader";font-style:italic;src:url(fonts/Newsreader-i.woff2) format("woff2");font-weight:200 800;font-display:swap}
</style>
"""

# Copie intégrée à l'APK : au lancement, elle passe la main à la version en ligne (même adresse à chaque fois,
# donc mêmes données). Elle transmet une fois sa progression (#import=) et reste en local si le site ne répond pas (#offline).
REDIRECT = """<script>
(function(){
  var R = %s;
  if (!R || location.protocol !== "file:") return;
  var S = window.localStorage;
  if (/offline/.test(location.hash)){
    try { S.setItem("pv-sync", "1"); var si = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v){ si.call(this, k, v); if (k.indexOf("pv-") === 0 && k !== "pv-sync") si.call(this, "pv-sync", "1"); }; } catch(e){}
    return;
  }
  var d = {}, n = 0;
  try { if (S.getItem("pv-sync") !== "0"){ for (var i = 0; i < S.length; i++){ var k = S.key(i); if (k.indexOf("pv-") === 0 && k !== "pv-sync" && k !== "pv-photos" && k !== "pv-ana" && k.indexOf("pv-img:") !== 0){ d[k] = S.getItem(k); n++; } } } S.setItem("pv-sync", "0"); } catch(e){}
  document.documentElement.style.background = "#F2F1EE";
  location.replace(R + (n ? "#import=" + encodeURIComponent(JSON.stringify(d)) : ""));
})();
</script>
"""


def run(cmd, **kw):
    print("+", " ".join(cmd) if isinstance(cmd, list) else cmd, flush=True)
    subprocess.run(cmd, check=True, **kw)


def build_app():
    """app/index.html (+ app/check.js pour la vérification de syntaxe)."""
    run([sys.executable, "build.py"], cwd=APP)
    if shutil.which("node"):
        run(["node", "--check", os.path.join(APP, "check.js")])
    return open(os.path.join(APP, "index.html"), encoding="utf-8").read()


def localize(h):
    """Polices locales à la place de Google Fonts, document HTML complet."""
    h = re.sub(r'<link rel="preconnect"[^>]*>\n?', "", h)
    h = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n?', "", h)
    h = h.replace("<style>", FONTS_CSS + "<style>", 1)
    assert "fonts.googleapis" not in h
    if "<!doctype" not in h.lower()[:50]:
        h = '<!doctype html>\n<html lang="fr">\n<head>\n' + h.replace('<div class="app">', '</head>\n<body>\n<div class="app">', 1) + "\n</body>\n</html>\n"
    return h


def fill(dst):
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(os.path.join(APP, "fonts"), os.path.join(dst, "fonts"))
    shutil.copytree(os.path.join(APP, "media"), os.path.join(dst, "media"))


def build_site():
    h = localize(build_app())
    fill(SITE)
    web = os.path.join(APP, "brand", "web")
    for f in ["icon-192.png", "icon-512.png", "icon-maskable-512.png"]:
        shutil.copy(os.path.join(web, f), os.path.join(SITE, f))
    man = {"name": "Défroisse", "short_name": "Défroisse", "lang": "fr", "start_url": "./", "scope": "./", "display": "standalone",
           "background_color": "#F2F1EE", "theme_color": "#F2F1EE",
           "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                     {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                     {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
    json.dump(man, open(os.path.join(SITE, "manifest.webmanifest"), "w"), ensure_ascii=False)
    h = h.replace("<head>\n", '<head>\n<meta name="robots" content="noindex">\n<link rel="manifest" href="manifest.webmanifest">\n'
                  '<link rel="apple-touch-icon" href="icon-192.png">\n<link rel="icon" type="image/png" href="icon-192.png">\n', 1)
    reg = '<script>if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js", {updateViaCache: "none"}).catch(() => {}));</script>\n'
    h = h.replace("\n</body>", "\n" + reg + "</body>", 1)
    open(os.path.join(SITE, "index.html"), "w", encoding="utf-8").write(h)
    open(os.path.join(SITE, ".nojekyll"), "w").write("")
    files = {}
    for r, _, fs in os.walk(SITE):
        for f in fs:
            p = os.path.relpath(os.path.join(r, f), SITE).replace(os.sep, "/")
            if p == ".nojekyll":
                continue
            files[p] = hashlib.sha1(open(os.path.join(r, f), "rb").read()).hexdigest()[:10]
    sw = open(os.path.join(TOOLS, "sw.template.js"), encoding="utf-8").read().replace("__FILES__", json.dumps(dict(sorted(files.items())), indent=0))
    open(os.path.join(SITE, "sw.js"), "w", encoding="utf-8").write(sw)
    size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(SITE) for f in fs) / 1e6
    print(f"Site prêt dans _site/ : {len(files)} fichiers, {size:.1f} Mo")


def jar(name):
    os.makedirs(BIN, exist_ok=True)
    path = os.path.join(BIN, name)
    url, sha = JARS[name]
    if not os.path.exists(path) or hashlib.sha256(open(path, "rb").read()).hexdigest() != sha:
        print("Téléchargement de", name, flush=True)
        urllib.request.urlretrieve(url, path)
        got = hashlib.sha256(open(path, "rb").read()).hexdigest()
        if got != sha:
            os.remove(path)
            sys.exit(f"{name} : empreinte inattendue ({got})")
    return path


def build_apk(remote, version_code, keystore, kspass, alias):
    if not remote.endswith("/"):
        remote += "/"
    if not re.match(r"^https://[^\s\"]+/$", remote):
        sys.exit("--remote doit être une adresse https complète, par exemple https://compte.github.io/defroisse/")
    h = localize(build_app())
    www = os.path.join(PROJ, "assets", "www")
    fill(www)
    open(os.path.join(www, "index.html"), "w", encoding="utf-8").write(h.replace("<head>\n", "<head>\n" + REDIRECT % json.dumps(remote), 1))
    tpl = open(os.path.join(ANDROID, "Client.smali.in"), encoding="utf-8").read()
    open(os.path.join(PROJ, "smali", "com", "visage", "protocole", "Client.smali"), "w", encoding="utf-8").write(tpl.replace("@@REMOTE@@", remote))
    vn = f"1.{version_code - 1}"
    yml = os.path.join(PROJ, "apktool.yml"); y = open(yml, encoding="utf-8").read()
    y = re.sub(r"versionCode: .*", f"versionCode: {version_code}", y); y = re.sub(r"versionName: .*", f"versionName: '{vn}'", y)
    open(yml, "w", encoding="utf-8").write(y)
    man = os.path.join(PROJ, "AndroidManifest.xml"); m = open(man, encoding="utf-8").read()
    m = re.sub(r'android:versionCode="\d+"', f'android:versionCode="{version_code}"', m); m = re.sub(r'android:versionName="[^"]*"', f'android:versionName="{vn}"', m)
    open(man, "w", encoding="utf-8").write(m)
    shutil.rmtree(os.path.join(PROJ, "build"), ignore_errors=True)
    shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
    unsigned = os.path.join(OUT, "defroisse-unsigned.apk")
    run(["java", "-jar", jar("apktool.jar"), "b", PROJ, "-o", unsigned])
    run(["java", "-jar", jar("uber-apk-signer.jar"), "-a", unsigned, "--ks", keystore, "--ksAlias", alias,
         "--ksPass", kspass, "--ksKeyPass", kspass, "-o", os.path.join(OUT, "signed")])
    signed = [f for f in os.listdir(os.path.join(OUT, "signed")) if f.endswith(".apk")]
    final = os.path.join(OUT, "Defroisse.apk")
    shutil.copy(os.path.join(OUT, "signed", signed[0]), final)
    run([sys.executable, os.path.join(TOOLS, "check_apk.py"), final])
    print(f"APK prêt : out/Defroisse.apk (version {version_code}, site {remote})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Construit Défroisse")
    ap.add_argument("cible", choices=["app", "site", "apk"])
    ap.add_argument("--remote", help="adresse du site en ligne, avec / final")
    ap.add_argument("--version-code", type=int, help="numéro de version Android, toujours plus grand que le précédent")
    ap.add_argument("--keystore", help="fichier de clé de signature (.jks)")
    ap.add_argument("--kspass", default=os.environ.get("KSPASS"), help="mot de passe de la clé (ou variable KSPASS)")
    ap.add_argument("--alias", default="visage")
    a = ap.parse_args()
    if a.cible == "app":
        build_app(); print("app/index.html prêt")
    elif a.cible == "site":
        build_site()
    else:
        missing = [n for n in ("remote", "version_code", "keystore", "kspass") if not getattr(a, n)]
        if missing:
            sys.exit("Il manque : " + ", ".join("--" + n.replace("_", "-") for n in missing))
        build_apk(a.remote, a.version_code, a.keystore, a.kspass, a.alias)
