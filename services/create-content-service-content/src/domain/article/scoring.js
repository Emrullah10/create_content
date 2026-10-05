// Puanlama: toplam KODDA hesaplanir (modelin verdigi bir toplam yoktur); kriter basina 0-5 medyan.
export const WEIGHTS = Object.freeze({ technical_depth: 0.35, structural_richness: 0.25, clarity: 0.2, originality: 0.2 });
export const CRITERIA = Object.freeze(Object.keys(WEIGHTS));
// Deterministik kontroller basarisizsa puan bu degeri asamaz: model "iyi" dese bile eksik yapili makale yuksek puan almaz.
export const STRUCTURE_FAIL_CAP = 60;

export const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// samples: JudgeSchema ciktilari (>=1). Donus: { score (0-100 tam sayi), criteria:{ad:{score, reasoning, samples}}, strengths, weaknesses }
export const aggregateJudgments = (samples) => {
  if (!samples.length) throw new Error('aggregateJudgments requires at least one sample');
  const criteria = {};
  let weighted = 0;
  for (const c of CRITERIA) {
    const scores = samples.map((s) => s[c]);
    const m = median(scores);
    weighted += m * WEIGHTS[c];
    // Gerekce: medyana en yakin ornegin gerekcesi.
    const closest = samples.reduce((best, s) => (Math.abs(s[c] - m) < Math.abs(best[c] - m) ? s : best), samples[0]);
    criteria[c] = { score: m, reasoning: closest[`${c}_reasoning`], samples: scores };
  }
  const uniq = (key) => [...new Set(samples.flatMap((s) => s[key]))].slice(0, 6);
  return { score: Math.round((weighted / 5) * 100), criteria, strengths: uniq('strengths'), weaknesses: uniq('weaknesses') };
};

export const applyStructureCap = (score, checksPassed) => (checksPassed ? score : Math.min(score, STRUCTURE_FAIL_CAP));
