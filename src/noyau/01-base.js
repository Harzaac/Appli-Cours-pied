/* ============================================================
   Noyau, 1/4 : dates et texte
   Aucune dépendance. Les fichiers de src/noyau/ sont concaténés dans l'ordre ;
   sous Node, test/outils/noyau.js les charge de la même façon.
   ============================================================ */
const DOW = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DOW_SHORT = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/* ---------- dates (UTC, sans décalage horaire) ---------- */
function pad2(n) { return String(n).padStart(2, '0'); }
function isoFromUTC(d) { return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
function parseISO(s) { const p = s.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); }
function addDays(iso, n) { const d = parseISO(iso); d.setUTCDate(d.getUTCDate() + n); return isoFromUTC(d); }
function diffDays(a, b) { return Math.round((parseISO(a) - parseISO(b)) / 86400000); }
function weekdayIndex(iso) { return (parseISO(iso).getUTCDay() + 6) % 7; }

/* ---------- texte ---------- */
function norm(s) {
  return String(s == null ? '' : s)
    .replace(/[‘’ʼ`´′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function cellText(v) {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  return norm(v);
}
function parseHM(str) {
  const m = /(\d+)\s*h\s*(\d{0,2})/i.exec(String(str || ''));
  if (!m) return null;
  return Number(m[1]) * 60 + (Number(m[2]) || 0);
}
