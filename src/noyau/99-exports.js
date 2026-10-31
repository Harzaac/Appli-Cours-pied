// Exports pour les tests sous Node (sans effet dans le navigateur).
if (typeof module !== 'undefined') {
  module.exports = {
    buildPlan, parseLines, parseWeekSheet, parseSommaire, parseVmaSheet, describeStep, makeSettings, paceCtx,
    paceSecPerKm, fmtPace, fmtHMS, fmtMS, fmtMin, parseTarget, parsePaceInput, parseVmaInput, addDays, diffDays, readXlsx, norm,
    planRange, mondayOf, shiftPlanToRace, shiftPlan, raceLabel, buildRecoveryPlan, parseChrono, parseDurationMin,
  };
}
