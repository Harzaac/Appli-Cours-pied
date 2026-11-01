/* Relais Strava de l'appli course à pied (Cloudflare Worker).
   Il garde le secret client de l'appli Strava, que la page web ne doit jamais voir, et ne fait que trois choses :
     POST /token        { code }           -> échange le code reçu après « Autoriser » contre des jetons
     POST /refresh      { refresh_token }  -> renouvelle le jeton d'accès (il expire au bout de 6 h)
     POST /deauthorize  { access_token }   -> déconnecte l'appli du compte Strava
   et /webhook pour les notifications de Strava (validation de l'abonnement, déconnexions).
   Il ne stocke rien : les jetons restent sur le téléphone de chaque coureur.

   Réglages (Settings › Variables and Secrets du Worker) :
     STRAVA_CLIENT_ID      ID client de l'appli Strava (variable)
     STRAVA_CLIENT_SECRET  secret client (secret chiffré)
     ALLOWED_ORIGINS       origines autorisées, séparées par des virgules (défaut : https://harzaac.github.io)
     WEBHOOK_TOKEN         mot choisi pour valider l'abonnement aux webhooks (facultatif) */
const STRAVA = 'https://www.strava.com';

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, headers || {}) });
}

async function tokenRequest(env, params) {
  const body = new URLSearchParams(Object.assign({ client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET }, params));
  const r = await fetch(STRAVA + '/oauth/token', { method: 'POST', body });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { status: r.status === 401 || r.status === 400 ? 401 : 502, data: { error: d.message || 'Strava a refusé la demande' } };
  // on ne renvoie que l'utile (pas le profil complet de l'athlète)
  const out = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at };
  if (d.athlete) out.athlete = { id: d.athlete.id, firstname: d.athlete.firstname || '' };
  return { status: 200, data: out };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // Webhook Strava : validation de l'abonnement (GET) et notifications (POST, dont les déconnexions).
    if (url.pathname === '/webhook') {
      if (req.method === 'GET') {
        const ok = env.WEBHOOK_TOKEN && url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === env.WEBHOOK_TOKEN;
        return ok ? json({ 'hub.challenge': url.searchParams.get('hub.challenge') }) : json({ error: 'refusé' }, 403);
      }
      // rien à effacer ici (aucune donnée gardée) : un accusé de réception suffit
      return json({ ok: true });
    }

    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://harzaac.github.io').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = allowed.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
      : null;
    if (req.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    if (!cors) return json({ error: 'origine non autorisée' }, 403);
    if (req.method !== 'POST') return json({ error: 'méthode non prise en charge' }, 405, cors);
    if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) return json({ error: 'relais non configuré (ID ou secret client manquant)' }, 500, cors);

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: 'demande illisible' }, 400, cors);

    if (url.pathname === '/token' && typeof body.code === 'string') {
      const r = await tokenRequest(env, { grant_type: 'authorization_code', code: body.code });
      return json(r.data, r.status, cors);
    }
    if (url.pathname === '/refresh' && typeof body.refresh_token === 'string') {
      const r = await tokenRequest(env, { grant_type: 'refresh_token', refresh_token: body.refresh_token });
      return json(r.data, r.status, cors);
    }
    if (url.pathname === '/deauthorize' && typeof body.access_token === 'string') {
      const r = await fetch(STRAVA + '/oauth/deauthorize', { method: 'POST', headers: { Authorization: 'Bearer ' + body.access_token } });
      return json({ ok: r.ok }, r.ok ? 200 : 502, cors);
    }
    return json({ error: 'demande inconnue' }, 404, cors);
  },
};
