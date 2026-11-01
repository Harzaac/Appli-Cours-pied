#!/usr/bin/env python3
"""Convertit des activités Strava (format list_activities du connecteur Strava, unités SI)
en fichier « sorties » pour l'appli : python3 outils/strava-vers-appli.py activites.json sorties.json

Le fichier produit s'importe dans l'appli (Mon profil › Ajouter des sorties). Il ne remplace rien :
chaque activité garde son numéro Strava, un second import du même fichier n'ajoute rien en double."""
import json, re, sys, datetime

GENERIC = re.compile(r"^(course à pied|evening run|morning run|lunch run|afternoon run|night run|entraînement aux poids|vélo elliptique|gravel|rameur|vélo|sortie à vélo|marche|randonnée|natation)\b.*(matin|midi|après-midi|soirée|nuit|run)?$", re.I)
RACE_NAME = re.compile(r"\b(semi|marathon|10 ?km|5 ?km|trail|corrida|foulées|course de|cross)\b", re.I)
WORKOUT = re.compile(r"(\d+\s*x\s*\d+|fraction|vma|allure|seuil|piste|côtes|cotes|tempo|\d{3,5}\s*/\s*\d{3,5})", re.I)
STD = [5.0, 10.0, 21.0975, 42.195]
SPORT_TYPE = {
    'Run': 'run', 'VirtualRun': 'run', 'TrailRun': 'trail',
    'Ride': 'velo', 'GravelRide': 'velo', 'MountainBikeRide': 'velo', 'VirtualRide': 'velo', 'EBikeRide': 'velo',
    'Swim': 'natation', 'WeightTraining': 'renfo', 'Workout': 'renfo', 'Crossfit': 'renfo', 'Yoga': 'renfo', 'Pilates': 'renfo',
}

def snap(km):
    for s in STD:
        if abs(km - s) / s < 0.035: return s
    return round(km, 2)

def convert(acts):
    out = []
    for a in acts:
        s = a['summary']; km = (s.get('distance') or 0) / 1000
        name = (a.get('name') or '').strip(); desc = (a.get('description') or '').strip()
        sport = a.get('sport_type') or ''
        kind = SPORT_TYPE.get(sport, 'autre')
        race = sport in ('Run', 'TrailRun') and ('Race' in (a.get('activity_tags') or []) or (RACE_NAME.search(name) and any(abs(km - x) / x < 0.035 for x in STD)))
        if race: typ = 'course'
        elif kind == 'run': typ = 'long' if km >= 18 else 'fractionne' if WORKOUT.search(name + ' ' + desc) else 'footing'
        else: typ = kind
        title = '' if GENERIC.match(name) else name
        if sport == 'VirtualRun' and not title: title = 'Tapis'
        if kind == 'autre' and not title: title = name  # « Vélo elliptique », « Rameur » : le nom dit ce que c'est
        out.append({
            'sid': str(a['id']), 'date': a['start_local'][:10], 'time': a['start_local'][11:16], 'sport': sport,
            'run': kind in ('run', 'trail'), 'type': typ, 'title': title, 'note': desc,
            'km': round(km, 2) if km else None, 'sec': s.get('moving_time') or 0, 'elapsed': s.get('elapsed_time') or 0,
            'dplus': round(s.get('elevation_gain') or 0) or None, 'race': bool(race), 'raceKm': snap(km) if race else None,
            'where': (a.get('location_summary') or '').split(',')[0],
        })
    out.sort(key=lambda x: (x['date'], x['time']))
    return out

if __name__ == '__main__':
    raw = json.load(open(sys.argv[1], encoding='utf8'))
    acts = raw['activities'] if isinstance(raw, dict) else raw
    res = {'app': 'appli-marathon', 'kind': 'sorties', 'source': 'Strava', 'exportedAt': datetime.datetime.now().isoformat(timespec='seconds'), 'activities': convert(acts)}
    json.dump(res, open(sys.argv[2], 'w', encoding='utf8'), ensure_ascii=False, indent=0)
    n = res['activities']
    print(len(n), 'activités ·', sum(1 for x in n if x['race']), 'courses ·', n[0]['date'] if n else '', '→', n[-1]['date'] if n else '')
