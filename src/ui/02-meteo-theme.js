/* ---------- météo (option, via Open-Meteo) ---------- */
const WX_DEFAULT = { on: true, lat: 48.1173, lon: -1.6778, name: 'Rennes', wind: 35, rain: 60, hot: 25, cold: 2 };
const WX_RACE = { lat: 50.6292, lon: 3.0573, name: 'Lille' };
function wxCfg() {
  const c = Object.assign({}, WX_DEFAULT, S.weather || {});
  if (c.lat === WX_RACE.lat && c.lon === WX_RACE.lon && c.name === 'Lille') { c.lat = WX_DEFAULT.lat; c.lon = WX_DEFAULT.lon; c.name = WX_DEFAULT.name; }
  return c;
}
function wxSet(patch) { S.weather = Object.assign({}, wxCfg(), patch); saveStore(); }
// Ville de la course : choisie pour ce plan, sinon Lille si le plan l'indique, sinon la ville d'entraînement.
function raceCity(e) {
  const rc = e && e.settings && e.settings.raceCity;
  if (rc && typeof rc.lat === 'number') return rc;
  if (e && /lille/i.test(e.plan.title || '')) return WX_RACE;
  const c = wxCfg();
  return { lat: c.lat, lon: c.lon, name: c.name };
}
function wxIcon(c) {
  if (c === 0) return '☀️'; if (c === 1) return '🌤️'; if (c === 2) return '⛅'; if (c === 3) return '☁️';
  if (c === 45 || c === 48) return '🌫️'; if (c >= 51 && c <= 57) return '🌦️'; if (c >= 61 && c <= 67) return '🌧️';
  if (c >= 71 && c <= 77) return '🌨️'; if (c >= 80 && c <= 82) return '🌦️'; if (c === 85 || c === 86) return '🌨️'; if (c >= 95) return '⛈️';
  return '🌡️';
}
function loadDaily(lat, lon) {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max&timezone=Europe%2FParis&wind_speed_unit=kmh&forecast_days=16';
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const to = ctl ? setTimeout(() => ctl.abort(), 10000) : null;
  return fetch(url, ctl ? { signal: ctl.signal } : {}).then((r) => { if (!r.ok) throw new Error('réponse ' + r.status); return r.json(); }).then((j) => {
    if (to) clearTimeout(to);
    const d = j.daily, days = {};
    d.time.forEach((t, i) => { if (d.temperature_2m_max[i] == null) return; days[t] = { code: d.weather_code[i], tmax: d.temperature_2m_max[i], tmin: d.temperature_2m_min[i], pp: d.precipitation_probability_max[i], rain: d.precipitation_sum[i], wind: d.wind_speed_10m_max[i], gust: d.wind_gusts_10m_max[i] }; });
    return { lat, lon, days };
  }, (e) => { if (to) clearTimeout(to); throw e; });
}
function fetchWeather(force) {
  const cfg = wxCfg();
  if (!cfg.on) return;
  const w = S.wx;
  const rc = raceCity(curEntry());
  const fresh = w && w.train && w.race && w.train.lat === cfg.lat && w.train.lon === cfg.lon && w.race.lat === rc.lat && w.race.lon === rc.lon && Date.now() - new Date(w.fetchedAt).getTime() < 3600e3;
  if (fresh && !force) return;
  S.wxState = { loading: true };
  const same = cfg.lat === rc.lat && cfg.lon === rc.lon;
  loadDaily(cfg.lat, cfg.lon).then((train) => (same ? Promise.resolve(train) : loadDaily(rc.lat, rc.lon)).then((race) => {
    S.wx = { fetchedAt: new Date().toISOString(), train, race };
    S.wxState = {}; saveStore(); render();
  })).catch((e) => { S.wxState = { err: true, why: String((e && e.message) || e).slice(0, 80) }; render(); });
}
function wxDay(date) {
  const cfg = wxCfg();
  if (!cfg.on || !S.wx || !S.wx.train || !S.wx.race) return null;
  const ref = S.byDate[date];
  if (ref && ref.entry && date === ref.entry.plan.raceDate) return ref.entry.id === S.activeId ? S.wx.race.days[date] || null : null;
  return S.wx.train.lat === cfg.lat && S.wx.train.lon === cfg.lon ? S.wx.train.days[date] || null : null;
}
function wxAlerts(d) {
  const c = wxCfg(), a = [];
  if (!d) return a;
  if (d.wind >= c.wind) a.push('vent fort (' + Math.round(d.wind) + ' km/h, rafales ' + Math.round(d.gust) + ')');
  else if (d.gust >= c.wind + 15) a.push('rafales (' + Math.round(d.gust) + ' km/h)');
  if (d.pp != null && d.pp >= c.rain) a.push('pluie probable (' + Math.round(d.pp) + ' %)');
  if (d.tmax >= c.hot) a.push('chaleur (' + Math.round(d.tmax) + '°)');
  if (d.tmin <= c.cold) a.push('froid (' + Math.round(d.tmin) + '°)');
  return a;
}
function wxMini(date, withAlerts) {
  const d = wxDay(date);
  if (!d) return '';
  const al = withAlerts ? wxAlerts(d) : [];
  return `<div class="wx" title="${esc(wxIcon(d.code))}"><span class="wx1"><span aria-hidden="true">${wxIcon(d.code)}</span><span class="num">${Math.round(d.tmin)}–${Math.round(d.tmax)}°</span></span><span class="wx2 num">${d.pp == null ? 'pluie ?' : Math.round(d.pp) + ' % pluie'} · ${Math.round(d.wind)} km/h</span>${al.length ? `<span class="badge warn">${esc(al[0].split(' (')[0])}</span>` : ''}</div>`;
}
function wxMonth(date) {
  const d = wxDay(date);
  return d ? `<span class="wxm num"><span aria-hidden="true">${wxIcon(d.code)}</span>${Math.round(d.tmax)}°</span>` : '';
}
function weatherNotice(w) {
  if (!wxCfg().on) return `<div class="movebar" role="status"><span>La météo est désactivée.</span><button class="btn small" data-act="wxtoggle">Activer</button></div>`;
  if (S.wxState.err && !S.wx) return `<div class="movebar" role="status"><span>Météo indisponible pour le moment (connexion ou navigateur qui bloque). Détail dans l'onglet Paramètres.</span></div>`;
  const out = [];
  weekDays(w).forEach((day) => {
    if (day.rest || day.category === 'race' || day.date < TODAY) return;
    const al = wxAlerts(wxDay(day.date));
    if (al.length) out.push(frDate(day.date, true).toLowerCase() + ' : ' + al.join(', '));
  });
  if (!out.length) return '';
  return `<div class="movebar warn" role="status"><span><strong>Météo à surveiller.</strong> ${esc(out.slice(0, 3).join(' · '))}. Tu peux décaler la séance avec « Déplacer ».</span></div>`;
}
function raceWeatherHTML() {
  const d = S.plan.raceDate && wxDay(S.plan.raceDate);
  if (!d) return '';
  const n = diffDays(S.plan.raceDate, TODAY);
  const tips = [];
  if (d.tmax >= 15) tips.push('À partir de 15° environ, on perd un peu de temps sur marathon : pars sans forcer et bois à chaque ravito.');
  if (d.tmax >= 22) tips.push('Chaleur : vise plutôt un temps un peu plus lent que l\'objectif.');
  if (d.tmin <= 5) tips.push('Frais au départ : prévois un vêtement jetable à garder jusqu\'au départ.');
  if (d.wind >= 25) tips.push('Vent marqué : reste dans un groupe quand tu peux.');
  if (d.pp != null && d.pp >= 50) tips.push('Pluie possible : casquette, et pense à la peau (vaseline) et aux chaussettes.');
  return `<div class="wxrace"><div class="wxrh"><span class="wxbig" aria-hidden="true">${wxIcon(d.code)}</span><div><strong>Météo du jour J · ${esc(raceCity(curEntry()).name)}</strong><div class="num">${Math.round(d.tmin)}–${Math.round(d.tmax)}° · pluie ${d.pp == null ? 'non prévue pour l\'instant' : Math.round(d.pp) + ' %'} · vent ${Math.round(d.wind)} km/h (rafales ${Math.round(d.gust)})</div></div></div>
    ${tips.length ? '<ul>' + tips.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>' : ''}
    <p class="sub">${n > 5 ? 'Prévision à ' + n + ' jours, encore peu fiable : regarde à nouveau les derniers jours.' : 'Prévision récente : regarde-la encore la veille.'}</p></div>`;
}

/* ---------- thème ---------- */
function applyTheme() {
  const r = document.documentElement;
  if (S.ui.theme === 'light' || S.ui.theme === 'dark') r.setAttribute('data-theme', S.ui.theme); else r.removeAttribute('data-theme');
  if (S.ui.accent && S.ui.accent !== 'ocean') r.setAttribute('data-accent', S.ui.accent); else r.removeAttribute('data-accent');
}
function effectiveDark() {
  return S.ui.theme === 'dark' || (S.ui.theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
}
