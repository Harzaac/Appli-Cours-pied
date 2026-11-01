# Relais Strava

Petit service (Cloudflare Worker, gratuit) qui garde le **secret client** de l'appli Strava. La page web
ne peut pas le contenir : tout le monde pourrait le lire. Le relais échange le code reçu après
« Autoriser » contre des jetons, et les renouvelle. Il ne stocke rien : les jetons restent sur l'appareil
de chaque coureur. Code : `worker.js` (testé par `test/unitaires/relais-strava.js`).

## Mise en place (une fois)

### 1. Créer l'appli Strava
Sur https://www.strava.com/settings/api :
- Nom : « Appli course ACHV » (au choix), catégorie « Training ».
- Site web : `https://harzaac.github.io/Appli-Cours-pied/`
- **Domaine du rappel d'autorisation** (Authorization Callback Domain) : `harzaac.github.io`
- Noter l'**ID client** et le **secret client**.

Une appli neuve ne sert qu'à un seul athlète (son créateur). On peut passer à 10 depuis la même page ;
au-delà, il faut demander une revue à Strava.

### 2. Déployer le relais sur Cloudflare (sans rien installer)
1. Créer un compte gratuit sur https://dash.cloudflare.com
2. **Workers & Pages › Create › Create Worker** (modèle « Hello World »), nom : `relais-strava-achv`, puis **Deploy**.
3. **Edit code** : remplacer tout le contenu par celui de `worker.js`, puis **Deploy**.
4. **Settings › Variables and Secrets › Add** :
   - `STRAVA_CLIENT_ID` (type Text) : l'ID client ;
   - `STRAVA_CLIENT_SECRET` (type **Secret**) : le secret client.
5. Noter l'adresse du Worker : `https://relais-strava-achv.<ton-sous-domaine>.workers.dev`

En ligne de commande, à la place : `cd relais-strava && npx wrangler deploy`, puis
`npx wrangler secret put STRAVA_CLIENT_SECRET` (et l'ID client dans `wrangler.toml`).

### 3. Brancher l'appli
Mettre l'ID client et l'adresse du relais dans `strava.config.json` (à la racine du dépôt), puis pousser :
GitHub Actions republie la version en ligne et le bouton « Connecter Strava » apparaît dans
Mon profil › Sorties de la montre. Le secret, lui, ne va jamais dans le dépôt.

## Réglages facultatifs
- `ALLOWED_ORIGINS` : sites autorisés à appeler le relais (défaut `https://harzaac.github.io`).
- `WEBHOOK_TOKEN` + abonnement aux webhooks Strava (`POST https://www.strava.com/api/v3/push_subscriptions`
  avec `callback_url=<relais>/webhook` et `verify_token=<le même mot>`) : demandé par les conditions de
  Strava pour être prévenu des déconnexions, utile si l'appli s'ouvre au club. L'appli gère déjà un accès
  retiré : elle oublie le jeton et propose de se reconnecter.
