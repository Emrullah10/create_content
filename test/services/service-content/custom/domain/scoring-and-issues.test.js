import { describe, test, expect } from '@jest/globals';
import { aggregateJudgments, applyStructureCap, median, WEIGHTS } from '../../../../../services/create-content-service-content/src/domain/article/scoring.js';
import { issuesFromChecks, groupIssuesBySection, headingKey } from '../../../../../services/create-content-service-content/src/domain/article/issue-mapping.js';
import { runQualityChecks } from '../../../../../services/create-content-service-content/src/domain/article/quality-checks.js';

const sample = (s, extra = {}) => ({ technical_depth: s[0], structural_richness: s[1], clarity: s[2], originality: s[3], technical_depth_reasoning: 'td', structural_richness_reasoning: 'sr', clarity_reasoning: 'cl', originality_reasoning: 'or', strengths: ['a'], weaknesses: ['w'], ...extra });

describe('puanlama', () => {
  test('ağırlıklar toplamı 1', () => expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1));
  test('median tek/çift', () => { expect(median([3, 1, 2])).toBe(2); expect(median([1, 2, 3, 4])).toBe(2.5); });
  test('tüm kriterler 5 ise 100, hepsi 0 ise 0, hepsi 4 ise 80', () => {
    expect(aggregateJudgments([sample([5, 5, 5, 5])]).score).toBe(100);
    expect(aggregateJudgments([sample([0, 0, 0, 0])]).score).toBe(0);
    expect(aggregateJudgments([sample([4, 4, 4, 4])]).score).toBe(80);
  });
  test('ağırlıklı toplam KODDA: depth 5 ve diğerleri 3', () => {
    expect(aggregateJudgments([sample([5, 3, 3, 3])]).score).toBe(Math.round(((5 * 0.35 + 3 * 0.65) / 5) * 100));
  });
  test('3 örnek: kriter başına medyan, aykırı değer etkisiz', () => {
    const out = aggregateJudgments([sample([4, 4, 4, 4]), sample([1, 4, 4, 4]), sample([4, 4, 4, 4])]);
    expect(out.criteria.technical_depth).toMatchObject({ score: 4, samples: [4, 1, 4] });
    expect(out.score).toBe(80);
  });
  test('zayıflıklar tekilleşir', () => {
    expect(aggregateJudgments([sample([3, 3, 3, 3], { weaknesses: ['x', 'y'] }), sample([3, 3, 3, 3], { weaknesses: ['y', 'z'] })]).weaknesses).toEqual(['x', 'y', 'z']);
  });
  test('örneksiz hata', () => expect(() => aggregateJudgments([])).toThrow());
  test('yapı tavanı', () => { expect(applyStructureCap(90, false)).toBe(60); expect(applyStructureCap(90, true)).toBe(90); expect(applyStructureCap(40, false)).toBe(40); });
});

const filler = (n, seed) => Array.from({ length: n }, (_, i) => `${seed}${i}w`).join(' ');
const sections = [
  { position: 1, kind: 'intro', heading: 'Introduction', body: filler(40, 'i'), plan: {} },
  { position: 2, kind: 'body', heading: 'Core', body: filler(60, 'c') + ' It is 40% faster.', plan: { codePlan: { language: 'js', shows: 'x' }, diagramPlan: { type: 'flowchart', shows: 'flow' } } },
  { position: 3, kind: 'body', heading: 'Compare', body: 'Let us delve into options. ' + filler(30, 'd'), plan: { tableHint: 'compares A and B' } },
];
const body = sections.map((s) => s.body).join('\n\n');

describe('kontrol -> bölüm sorunları', () => {
  const checkResult = runQualityChecks({ body });
  const issues = issuesFromChecks({ checkResult, sections });
  const by = (frag) => issues.filter((i) => i.problem.includes(frag));

  test('intro anahtarı INTRO', () => expect(headingKey(sections[0])).toBe('INTRO'));
  test('kaynaksız yüzde ilgili bölüme', () => expect(by('40%')[0].sectionHeading).toBe('Core'));
  test('klişe ilgili bölüme', () => expect(by('delve')[0].sectionHeading).toBe('Compare'));
  test('plan kod/diyagram istiyor ama yok', () => {
    expect(by('code example')[0].sectionHeading).toBe('Core');
    expect(by('diagram')[0].sectionHeading).toBe('Core');
  });
  test('kısa makale: en ince gövde bölümlerine genişletme görevi', () => expect(by('words short').length).toBeGreaterThan(0));
  test('tablo uyarısı plana göre bölüme', () => expect(issues.find((i) => i.problem.includes('table'))?.sectionHeading).toBe('Compare'));
  test('gruplama: eşleşen ve eşleşmeyen', () => {
    const { groups, unmatched } = groupIssuesBySection([...issues.slice(0, 2), { sectionHeading: 'Nope', problem: 'p', fix: 'f' }], sections);
    expect(groups.length).toBeGreaterThan(0);
    expect(unmatched).toHaveLength(1);
  });
  test('temiz makalede sorun yok', () => {
    const ok = { passed: true, errors: [], warnings: [], metrics: { words: 9999 } };
    expect(issuesFromChecks({ checkResult: ok, sections })).toEqual([]);
  });
});
