# Reprise du projet : à lire en premier

Note de passation pour reprendre l'appli dans une nouvelle conversation (avec Claude ou un autre outil).
Point d'arrivée : **version 3.16**, 1er novembre 2026.

## En deux phrases

« Appli course à pied » est un calendrier d'entraînement de course à pied pour Adrien et le club
AC Haute Vilaine (ACHV), livré en **un seul fichier HTML hors ligne** (sans serveur ni compte).
Les plans viennent des fichiers Excel du coach, Pierre (le père d'Adrien) ; les allures sont calculées
à partir de la VMA et du temps visé.

## Démarrer

```
unzip appli-course-a-pied-source.zip -d appli && cd appli
node build.js                                   # -> dist/appli-course-a-pied.html et dist/artifact.html
NODE_PATH=/opt/node22/lib/node_modules node test/tout.js     # 20 tests (unitaires + parcours Playwright)
NODE_PATH=/opt/node22/lib/node_modules node test/visuel.js   # régénère les 64 captures de référence
```

Aucune dépendance à installer pour l'appli. Les tests demandent Playwright + Chromium
(cherchés via `NODE_PATH`). Le dossier `.git` n'est pas dans le zip : faire `git init` pour repartir.

## Organisation du code

Le détail fichier par fichier est dans le `README.md`. En bref, `build.js` concatène dans l'ordre :

1. `src/noyau/*.js` : dates et texte, lecture `.xlsx` maison (zip + XML, couleurs de cellules),
   format des plans du coach, allures. Testable sous Node via `test/outils/noyau.js`.
2. `src/fit.js` : encodeur `.fit` (séance structurée Garmin).
3. `src/ui/*.js` : état `S`, rendu par chaînes HTML (`render()` reconstruit la page), événements
   délégués sur `document` (`data-act="…"`).
4. `src/css/*.css` : toutes les couleurs passent par les jetons de `01-jetons.css`
   (clair, sombre, 5 accents : ocean, foret, braise, aurore, lagon).

`build.js` injecte aussi `APP_NAME`, `APP_VERSION` (lu dans `package.json`), `CLUB_NAME` et le logo.

## Règles à respecter

- **Données** : clé `localStorage` `appli-marathon-v1` et champ `app: 'appli-marathon'` dans les
  exports. Ne pas les renommer (compatibilité avec les profils déjà exportés).
- **Version** : changer seulement `package.json` (3.16.0 -> 3.17.0) ; le pied de page suit.
- **Textes** en français, tutoiement, phrases simples. Vocabulaire fixé : « Exporter / Importer mon
  profil » (pas « sauvegarde »), « Course » (pas « marathon ») quand le plan peut être une autre distance.
- **Actions destructrices** : pas de confirmation, mais un toast « Annuler » (`withUndo`).
- **Tests** : tout nouveau parcours a son script dans `test/parcours/` (il doit finir par « pas d'erreur »).
  Les tests coupent le réseau externe (`test/outils/hors-ligne.js`).
- **Commits** au nom d'Adrien (adrien.colas@protonmail.com).

## État au 1er novembre 2026

- Adrien a couru le Marathon de Lille le 25/10/2026 en 3h25 (record).
- Fait récemment : 3.14 pied de page ; 3.15 relecture (textes, alerte si le stockage est bloqué,
  noyau découpé) ; 3.16 prédictions alignées + carte « Temps de passage » pour toute distance.
- **En discussion** : renommer l'onglet « VMA », devenu trop étroit (il contient VMA et objectif,
  prédictions, passages, tests de VMA, tableau du coach). Pistes : « Allures », « Mon niveau ».
- **À vérifier par Adrien** : le `.fit` sur sa Forerunner 945 (jamais testé sur la montre) ;
  les accents dans les noms de séance Garmin (retirés par prudence) ; la météo bloquée dans Edge.

## Prochain gros chantier

Version en ligne installable sur Android (PWA, par exemple GitHub Pages) : manifeste, service worker,
icônes (déjà dans `assets/`), données gardées d'une version à l'autre. Ensuite la synchro Strava
(OAuth : demande la version en ligne et un petit relais pour le secret client).
Le reste des idées est dans `docs/idees.md`.
