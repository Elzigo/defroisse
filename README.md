# Défroisse

App de massages du visage (programme de 12 semaines, gestes en vidéo, photos avant/après), en français.

- Version en ligne : publiée sur GitHub Pages à chaque push sur `main` (`.github/workflows/site.yml`).
- App Android : un APK qui ouvre la version en ligne, donc toujours à jour, avec une copie intégrée pour le hors connexion (`.github/workflows/apk.yml`, lancé à la main).

## Arborescence

| Dossier | Contenu |
|---|---|
| `app/` | Les sources : `head.html` (styles), `body1.html` et `panels.html` (écrans), `app.js` (logique), `photos.js` (onglet Photos), `tech.js` et `tech_rides.js` (gestes), `data.js` (routines), `content/` (aliments, actifs, outils, nouveautés), `brand/`, `fonts/`, `media/` (photos et vidéos des gestes). `app/build.py` assemble tout en une page `app/index.html`. |
| `tools/build.py` | Construit `_site/` (version en ligne + service worker) ou l'APK. |
| `tools/sw.template.js` | Service worker : garde l'app hors connexion et récupère chaque nouvelle version à l'ouverture. |
| `android/` | Projet Android (apktool) : WebView, caméra, choix de photo, retour sur la copie intégrée sans réseau. `Client.smali.in` reçoit l'adresse du site à la construction. |

## Mettre à jour l'app

1. Modifier les fichiers de `app/`.
2. Vérifier : `python3 tools/build.py site` (et `node --check app/check.js` si Node est installé).
3. `git commit` puis `git push` sur `main`. Le site est en ligne environ 2 minutes plus tard, et l'app Android l'affiche à sa prochaine ouverture avec Internet.

Un nouvel APK n'est utile que si `android/` change : relancer le workflow « App Android (APK) » avec un `version_code` plus grand. L'APK doit toujours être signé avec la même clé (secrets `ANDROID_KEYSTORE_B64` et `ANDROID_KEYSTORE_PASSWORD`), sinon il ne s'installe pas par-dessus l'ancien.

## Données de l'utilisatrice

Tout reste sur le téléphone : progression dans `localStorage` (clés `pv-*`), photos dans IndexedDB (repli sur `localStorage`, clés `pv-img:*`). Rien n'est envoyé au site. L'analyse des photos par l'IA ne fonctionne que dans la version publiée sur claude.ai.
