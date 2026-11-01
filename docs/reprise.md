# Reprise du projet : à lire en premier

Note de passation pour reprendre l'appli dans une nouvelle conversation (avec Claude ou un autre outil).
Point d'arrivée : **version 3.20**, 1er novembre 2026.

## En deux phrases

« Appli course à pied » est un calendrier d'entraînement de course à pied pour Adrien et le club
AC Haute Vilaine (ACHV), livré en **un seul fichier HTML hors ligne** (sans serveur ni compte), et depuis la 3.19 aussi en
**version en ligne installable sur Android** (PWA sur GitHub Pages : https://harzaac.github.io/Appli-Cours-pied/).
Les plans viennent des fichiers Excel du coach, Pierre (le père d'Adrien) ; les allures sont calculées
à partir de la VMA et du temps visé.

## Démarrer

Le code vit sur GitHub : **https://github.com/Harzaac/Appli-Cours-pied** (branche `main`, historique complet).

```
git clone https://github.com/Harzaac/Appli-Cours-pied.git appli && cd appli
node build.js                                   # -> dist/appli-course-a-pied.html, dist/artifact.html et dist/web/ (version en ligne)
NODE_PATH=/opt/node22/lib/node_modules node test/tout.js     # 20 tests (unitaires + parcours Playwright)
NODE_PATH=/opt/node22/lib/node_modules node test/visuel.js   # régénère les 64 captures de référence
```

Aucune dépendance à installer pour l'appli. Les tests demandent Playwright + Chromium
(cherchés via `NODE_PATH`). En fin de travail : commit (au nom d'Adrien) puis `git push`.

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
- 3.18 : import des sorties Strava (fichier préparé par Claude via le connecteur Strava).
- 3.17 : l'onglet « VMA » s'appelle « Allures » (VMA et objectif, prédictions, passages, tests, tableau du coach).
- **À vérifier par Adrien** : le `.fit` sur sa Forerunner 945 (jamais testé sur la montre) ;
  les accents dans les noms de séance Garmin (retirés par prudence) ; la météo bloquée dans Edge.

## Version en ligne (depuis la 3.19)

- `build.js` produit aussi `dist/web/` : `index.html` (même page que le fichier + manifeste, `theme-color`,
  balises marquées `data-web`), `manifest.webmanifest`, `sw.js` (depuis `src/web/sw.js`), icônes (dont
  `icone-maskable-*.png` pour Android). `dist/web/` n'est pas versionné : GitHub Actions le reconstruit.
- Publication : `.github/workflows/pages.yml`, à chaque push sur `main` (Settings › Pages › Source : GitHub Actions).
- `src/ui/13-web.js` : `isWeb()` (http(s) + manifeste), enregistrement du service worker, bandeau
  « Nouvelle version de l'appli prête › Mettre à jour » (la nouvelle version ne prend la main qu'au clic),
  bandeau et bouton « Installer », stockage durable (`navigator.storage.persist`), carte des Paramètres
  (« Sur ton téléphone » en ligne, « Version en ligne » dans le fichier).
- Service worker : cache nommé d'après la version + empreinte de la page (toute publication = mise à jour),
  page servie depuis le cache (hors ligne), polices gardées, météo et le reste en direct.
- Données : même clé `localStorage`, sur l'origine `harzaac.github.io`. Le fichier et la version en ligne
  ne partagent pas leurs données : passage par Exporter / Importer mon profil. La copie « avec mes données »
  faite en ligne retire les balises `data-web` et redevient un fichier autonome.
- Test : `test/parcours/pwa.js` (petit serveur local, hors ligne, mise à jour simulée, copie).

## Synchro Strava par l'API (depuis la 3.20, version en ligne)

- `src/ui/09d-strava.js` : « Connecter Strava » (Mon profil › Sorties de la montre) envoie sur la page
  d'autorisation de Strava (`scope=read,activity:read_all`, `state` vérifié au retour) ; le relais échange le code.
  Jetons sous la clé à part `appli-marathon-v1-strava` (jamais dans un export). Synchro à l'ouverture et au
  retour au premier plan (au plus toutes les 30 min) et bouton « Synchroniser » : `GET /athlete/activities`
  depuis `sortiesUntil` − 3 jours (sinon le 1er janvier), jeton dans l'en-tête `Authorization`, conversion
  `stravaToSortie` (mêmes règles que `outils/strava-vers-appli.py` ; `workout_type 1` = course), puis le même
  `importSorties` que la 3.18, avec Annuler. 401 : jeton oublié, « reconnecte-toi ». « Déconnecter » retire l'accès.
- `relais-strava/worker.js` : Cloudflare Worker qui garde le secret client (`/token`, `/refresh`,
  `/deauthorize`, `/webhook`), CORS limité à `https://harzaac.github.io`. Mise en place : `relais-strava/LISEZMOI.md`.
- `strava.config.json` : ID client (public) et adresse du relais, injectés par `build.js`. **Vides tant
  qu'Adrien n'a pas créé l'appli Strava et le relais** : la synchro n'apparaît pas.
- Tests : `test/unitaires/relais-strava.js`, `test/parcours/strava-api.js` (Strava et relais simulés).
- À vérifier en vrai : l'API Strava appelée directement depuis la page (CORS) ; sinon, la faire passer par le relais.

## Sorties Strava par fichier (depuis la 3.18)

Adrien a branché le **connecteur Strava** de Claude (lecture seule, abonnement Strava requis).
Pour mettre l'appli à jour :
1. Lire les activités avec le connecteur (`list_activities`, `include_tags: true`, unités SI, depuis la
   date « Sorties importées jusqu'au… » affichée dans Mon profil). Les gros résultats sont enregistrés
   dans un fichier par l'outil : fusionner les pages en une liste JSON.
2. `python3 outils/strava-vers-appli.py activites.json sorties.json` (format décrit dans le script).
3. Adrien importe `sorties.json` : Mon profil › Sorties de la montre › Ajouter des sorties
   (ou glisser le fichier sur la page). Rien n'est remplacé ; les numéros Strava évitent les doublons.

Règles d'import (`src/ui/09c-sorties.js`) : la plus longue course à pied d'un jour de séance coche la
séance et garde le réalisé (`tracking[date].act`) ; une course taguée devient le résultat du plan ou une
course sans plan (qui coche aussi la séance du jour) ; le reste devient une sortie libre (`logs`, avec `sid`).
Un chrono saisi à la main n'est jamais écrasé. La fréquence cardiaque n'est pas importée (un appel par activité).
Premier import : 149 activités de 2026 (135 courses à pied, ~1 585 km).

## Prochain gros chantier

Brancher la synchro Strava : Adrien crée l'appli Strava et le relais (`relais-strava/LISEZMOI.md`), puis
remplir `strava.config.json` et pousser.
**À vérifier par Adrien** : installation sur son téléphone Android, passage de son profil du fichier vers la version en ligne.
Le reste des idées est dans `docs/idees.md`.
