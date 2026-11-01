# Idées pour la suite

Liste tenue à jour avec Adrien. Ce qui est fait est rayé, avec la version.

## Gros chantiers (version en ligne)
- ~~Appli en ligne, installable sur Android (PWA : icône, hors ligne, météo partout, données gardées d'une version à l'autre)~~ (3.19)
- Fréquence cardiaque et tours au km dans l'import Strava (un appel par activité : à faire pour les séances clés).
- ~~Synchro Strava par API (sorties de la montre rangées automatiquement) : bouton « Connecter Strava », même import que la 3.18~~ (3.20, à brancher : appli Strava + relais)
- Comptes et club : partager un plan avec le groupe, le coach voit qui a fait quelle séance.
- Page de club : calendrier des courses du club, sorties collectives, plans du coach disponibles d'un clic.
- Rappels de séance sur le téléphone (une fois installable).
- ~~Lien vers la page de la course (Klikego, Finishers…)~~ (3.13)
- Référentiel de courses : chercher une course par nom/lieu/date et pré-remplir date, distance, dénivelé (voir l'étude ci-dessous).

## Course à pied
- ~~Tests de VMA (demi-Cooper, VAMEVAL…) et évolution de la VMA~~ (3.12)
- ~~Conseils selon la météo pour les séances~~ (3.12)
- Charge d'entraînement : fatigue / forme selon volume et intensité, alerte de montée trop rapide.
- Chaussures : paires et kilomètres, alerte vers 600–800 km.
- Dénivelé et trail : séances de côtes, distance et D+ des courses.
- Import des sorties de la montre par fichier (.fit/.gpx, dossier GARMIN › Activity), en secours de Strava.
- Export vers le calendrier du téléphone (.ics).

## Expérience
- Premier lancement guidé pour les nouveaux membres (prénom, VMA, plan ou course).
- Semaine sur téléphone : bande des 7 jours + carte du jour sélectionné.

## À vérifier
- Accents dans les noms de séance du .fit, à trancher après le test sur la montre.
- Export Garmin (.fit) sur la vraie Forerunner 945 : jamais testé sur la montre.
- Météo bloquée dans Edge chez Adrien (cause locale non trouvée).

## Fait
- 3.20 : synchro Strava par l'API dans la version en ligne (relais Cloudflare Worker pour le secret client).
- 3.19 : version en ligne installable sur Android (GitHub Pages), mise à jour proposée par un bandeau, fichier HTML toujours là.
- 3.18.2 : bouton « Cette semaine » / « Ce mois-ci » mis en avant quand on regarde une autre période.
- 3.18.1 : le calendrier remonte jusqu'à la première donnée (au moins 8 semaines).
- 3.18 : import des sorties Strava (via le connecteur Strava de Claude), réalisé affiché dans les séances.
- 3.17 : onglet VMA renommé Allures.
- 3.16 : prédictions alignées, temps de passage pour toute distance. 3.15 : relecture (textes, alerte de stockage, noyau découpé). 3.14 : pied de page.
- 3.11 : Annuler après suppression, séances modifiables ou ajoutées, zones de fréquence cardiaque.
- 3.10 : photo de profil. 3.9 : profil en haut à droite, image du bandeau modifiable, palettes Aurore et Lagon.
- 3.8 : profil exportable, courses sans plan, plan de reprise. 3.7 : boutons Enregistrer et confirmations.

## Plan retenu : synchro Strava par API (1er/11/2026)
- L'échange du code OAuth et le rafraîchissement du jeton demandent le **secret client** : il ne peut pas vivre dans la page.
  Relais retenu : un petit Cloudflare Worker (gratuit) avec deux routes, `/token` et `/refresh`, secret gardé côté Worker,
  CORS limité à `https://harzaac.github.io`.
- La page appelle ensuite l'API Strava directement avec le jeton d'accès (dans l'en-tête `Authorization`, obligatoire en 2027),
  et passe les activités dans le même import que la 3.18 (`09c-sorties.js`).
- Appli Strava à créer par Adrien (strava.com/settings/api) : domaine de rappel `harzaac.github.io`. Nouvelle appli = 1 athlète
  (« Single Player Mode »), passable à 10 sans revue ; au-delà, revue Strava. Accès Standard : abonnement Strava requis.
- Les conditions de l'API demandent de gérer la déconnexion (webhook) : à prévoir dans le Worker si l'appli s'ouvre au club.

## Étude : référentiel de courses (théorique, 31/10/2026)
- FFA (athle.fr) : calendrier officiel des courses labellisées, consultable en ligne, sans API publique connue.
- RunningMap.org : calendrier national des courses, publie un jeu de données sur data.gouv.fr (licence ouverte annoncée pour le site ; contenu, format et fraîcheur du jeu à vérifier).
- Applis commerciales (Campus Coach…) : leur propre calendrier, sans accès ouvert.
- Piste retenue : avec la version en ligne, chercher une course dans un jeu de données ouvert et pré-remplir nom, date, lieu, distance ; sinon un petit catalogue des courses du club, tenu à la main.
- Klikego et Finishers (vérifié le 31/10/2026) : pas d'API publique ; Klikego revendique ses droits sur sa base (reproduction soumise à accord écrit). Retenu : un simple lien vers la page de la course.
