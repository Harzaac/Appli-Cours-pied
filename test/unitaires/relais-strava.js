// Relais Strava (relais-strava/worker.js) : origines autorisées, échange du code, renouvellement, secret jamais renvoyé, webhook.
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'relais-strava', 'worker.js'), 'utf8');
const env = { STRAVA_CLIENT_ID: '4242', STRAVA_CLIENT_SECRET: 'tres-secret', WEBHOOK_TOKEN: 'mot' };
const calls = [];
global.fetch = async (url, init) => {
  const body = init && init.body ? Object.fromEntries(new URLSearchParams(String(init.body))) : {};
  calls.push({ url, body, auth: init && init.headers && init.headers.Authorization });
  if (url.endsWith('/oauth/token')) {
    if (body.code === 'mauvais') return new Response(JSON.stringify({ message: 'Bad Request' }), { status: 400 });
    return new Response(JSON.stringify({ access_token: 'acc', refresh_token: 'ref2', expires_at: 2000000000, athlete: { id: 7, firstname: 'Adrien', city: 'Rennes', weight: 70 } }), { status: 200 });
  }
  if (url.endsWith('/oauth/deauthorize')) return new Response('{}', { status: 200 });
  return new Response('', { status: 404 });
};
const req = (p, o) => new Request('https://relais.test' + p, Object.assign({ method: 'POST', headers: { Origin: 'https://harzaac.github.io', 'Content-Type': 'application/json' } }, o));
(async () => {
  const w = (await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'))).default;
  let r = await w.fetch(req('/token', { body: JSON.stringify({ code: 'abc' }) }), env);
  let d = await r.json();
  assert.strictEqual(r.status, 200); assert.strictEqual(d.access_token, 'acc'); assert.deepStrictEqual(d.athlete, { id: 7, firstname: 'Adrien' });
  assert.strictEqual(r.headers.get('Access-Control-Allow-Origin'), 'https://harzaac.github.io');
  assert.deepStrictEqual(calls[0].body, { client_id: '4242', client_secret: 'tres-secret', grant_type: 'authorization_code', code: 'abc' });
  assert.ok(!JSON.stringify(d).includes('tres-secret'), 'le secret ne sort jamais du relais');
  console.log('ok    échange du code : jetons et prénom seulement, secret gardé');

  r = await w.fetch(req('/refresh', { body: JSON.stringify({ refresh_token: 'ref1' }) }), env);
  assert.strictEqual(r.status, 200); assert.strictEqual(calls[1].body.grant_type, 'refresh_token'); assert.strictEqual(calls[1].body.refresh_token, 'ref1');
  console.log('ok    renouvellement du jeton');

  r = await w.fetch(req('/token', { body: JSON.stringify({ code: 'mauvais' }) }), env);
  assert.strictEqual(r.status, 401); assert.ok((await r.json()).error);
  console.log('ok    code refusé par Strava : 401 avec message');

  r = await w.fetch(req('/token', { body: JSON.stringify({ code: 'abc' }), headers: { Origin: 'https://ailleurs.example', 'Content-Type': 'application/json' } }), env);
  assert.strictEqual(r.status, 403); assert.strictEqual(r.headers.get('Access-Control-Allow-Origin'), null);
  r = await w.fetch(req('/token', { method: 'OPTIONS', body: undefined }), env);
  assert.strictEqual(r.status, 204);
  console.log('ok    autre site refusé, pré-vérification CORS acceptée pour l\'appli');

  r = await w.fetch(req('/deauthorize', { body: JSON.stringify({ access_token: 'acc' }) }), env);
  assert.strictEqual(r.status, 200); assert.strictEqual(calls[calls.length - 1].auth, 'Bearer acc');
  console.log('ok    déconnexion transmise à Strava');

  r = await w.fetch(new Request('https://relais.test/webhook?hub.mode=subscribe&hub.verify_token=mot&hub.challenge=xyz'), env);
  assert.deepStrictEqual(await r.json(), { 'hub.challenge': 'xyz' });
  r = await w.fetch(new Request('https://relais.test/webhook?hub.mode=subscribe&hub.verify_token=faux&hub.challenge=xyz'), env);
  assert.strictEqual(r.status, 403);
  console.log('ok    webhook : abonnement validé avec le bon mot seulement');

  r = await w.fetch(req('/token', { body: JSON.stringify({ code: 'abc' }) }), { STRAVA_CLIENT_ID: '4242' });
  assert.strictEqual(r.status, 500);
  console.log('ok    relais sans secret : erreur claire');
})().catch((e) => { console.log('ÉCHEC ' + e.message); process.exit(1); });
