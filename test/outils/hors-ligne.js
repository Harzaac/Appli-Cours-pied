// Coupe le réseau externe (polices Google, météo) pour tous les onglets d'un navigateur de test.
// Sans ça, une police lente à arriver bloque l'affichage et les tests échouent au hasard quand la machine est chargée.
module.exports = function horsLigne(b) {
  const nc = b.newContext.bind(b);
  b.newContext = async (o) => { const c = await nc(o); await c.route(/open-meteo\.com|fonts\.g(oogleapis|static)\.com/, (r) => r.abort()); return c; };
  b.newPage = async (o) => { const c = await b.newContext(o); return c.newPage(); };
  return b;
};
