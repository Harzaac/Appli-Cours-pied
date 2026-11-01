# Appli course à pied

> Reprise du projet : lire d'abord [`docs/reprise.md`](docs/reprise.md).

Calendrier d'entraînement de course à pied (AC Haute Vilaine) livré en **un seul fichier HTML**, sans serveur ni compte :
plans du coach importés depuis Excel, allures calculées selon la VMA, suivi des séances et des
sorties libres, plan et écran de course, export d'une séance en `.fit` pour une montre Garmin.
Les données restent dans le navigateur ; une « copie avec mes données » les embarque dans le fichier.
Aussi en **version en ligne installable sur Android** : https://harzaac.github.io/Appli-Cours-pied/

## Construire

```
node build.js
```

Produit `dist/appli-course-a-pied.html` (le fichier à ouvrir ou à transmettre) et `dist/artifact.html`
(même contenu sans les balises `html/head/body`), et `dist/web/` : la version en ligne (page, manifeste,
service worker `src/web/sw.js`, icônes), publiée sur GitHub Pages par `.github/workflows/pages.yml`. `build.js` assemble, dans l'ordre :

- `src/noyau/` — (01 dates et texte, 02 xlsx, 03 format du coach, 04 allures) lecture du `.xlsx` (zip + XML, sans dépendance), contrôle du fichier du coach,
  construction du plan, recalage par date de course, moteur d'allures, saisies (temps, allures, durées).
  Utilisable aussi sous Node (`module.exports`) pour les tests.
- `src/fit.js` — encodage d'une séance en fichier `.fit` (structured workout Garmin).
- `src/ui/*.js` — l'interface, par ordre de nom :
  | fichier | rôle |
  |---|---|
  | `01-etat.js` | état `S`, stockage local, plans, profil, index du calendrier (`S.byDate`, `S.weeks`) |
  | `02-meteo-theme.js` | météo Open-Meteo, thème clair/sombre, couleur d'accent |
  | `03-entete.js` | bandeau, compte à rebours ou chrono, prochaine séance, pied de page |
  | `04-calendrier.js` | semaine, mois, cartes de jour, fenêtre de détail, sorties libres, résultat |
  | `05-vma.js` | onglet Allures : niveau, prédictions, temps de passage, tests de VMA, tableau du coach |
  | `06-course.js` | plan de course, ravitaillements, écran de course |
  | `07-bilan.js` | onglet Progression : où j'en suis, suivi du plan, mes courses, sensations, l'année |
  | `08-donnees.js` | onglet Paramètres, Mon profil (export / import), vue Mes plans, alerte de stockage |
  | `09-import.js` | vérification d'un Excel et choix de la date de course |
  | `09b-courses.js` | courses sans plan, plan de reprise |
  | `09c-sorties.js` | import d'un fichier de sorties (Strava) : séances cochées avec le réalisé, courses, sorties libres |
  | `10-rendu.js` | assemblage de la page, rendu |
  | `11-actions.js` | actions métier (ajout, mise à jour, recalage, suppression de plan, restauration) |
  | `12-evenements.js` | clics, saisies, glisser-déposer, clavier |
  | `13-web.js` | version en ligne : service worker, mise à jour, installation, carte des Paramètres |
- `src/css/*.css` — styles par ordre de nom : jetons de couleur (clair, sombre, accents), base,
  briques, en-tête, calendrier, fenêtre de détail, vues, impression. Toutes les couleurs passent par
  les jetons de `01-jetons.css`.

## Données

Clé `localStorage` : `appli-marathon-v1`. Contenu : `plans[]` (plan recalé + réglages par plan),
`tracking` et `moves` indexés par date, `logs` (sorties libres par date), `profile` (VMA et objectif
hors plan, course de référence), préférences. Une copie HTML embarque ces données dans
`<script id="embedded-data">` ; au chargement, la version la plus récente l'emporte.
L'ancien format (un seul plan) est converti à la lecture.

## Tester

```
npm test                 # construit puis lance test/tout.js
npm run captures         # compare 64 captures (PC/mobile × clair/sombre) aux captures de référence
```

- `test/unitaires/` — parseur, lecture `.xlsx`, encodage `.fit`.
- `test/parcours/` — parcours complets dans Chromium (Playwright) : calendrier vide, plusieurs plans,
  sorties et chrono, restauration, Garmin, écran de course, rappels, version en ligne (`pwa.js`).
- `test/visuel.js` + `test/compare.py` — non-régression visuelle ; après un changement voulu,
  régénérer la référence avec `node test/visuel.js` (sans argument).
- `test/outils/hors-ligne.js` — coupe le réseau externe (polices, météo) dans les tests : sans ça, une police lente faisait échouer des tests au hasard.
- `test/donnees/` — plan Excel de test, export texte du classeur, captures de référence.
- `test/archives/` — anciens scripts de vérification, gardés pour mémoire.

Playwright est cherché via `NODE_PATH` (par défaut `/opt/node22/lib/node_modules`).
