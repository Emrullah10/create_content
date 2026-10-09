import { describe, test, expect } from '@jest/globals';
import { runQualityChecks, findUnsupportedNumbers, findDuplicateParagraphs, findBannedPhrases, findLeftovers } from '../../../../../services/create-content-service-content/src/domain/article/quality-checks.js';
import { verifyFacts, quoteInSource, buildBrief, allowedTextOf } from '../../../../../services/create-content-service-content/src/domain/research/facts.js';
import { dedupKeyOf, canTransitionTopic } from '../../../../../services/create-content-service-content/src/domain/topic/topic-rules.js';
import { nextStageAfter } from '../../../../../services/create-content-service-content/src/domain/pipeline/stages.js';

const filler = (n, seed = 'alpha') => Array.from({ length: n }, (_, i) => `${seed}${i}word`).join(' ');
const fence = (lang, body) => ['```' + lang, body, '```'].join('\n');
const goodBody = () =>
  ['intro ' + filler(150, 'intro')]
    .concat([1, 2, 3, 4, 5].map((n) => `## Section ${n}\n\n${filler(300, 'sec' + n)}\n\n${fence('js', 'const x = ' + n + ';')}`))
    .concat([fence('mermaid', 'flowchart TD\n A-->B'), fence('mermaid', 'flowchart TD\n B-->C'), '| a | b |\n|---|---|\n| 1 | 2 |'])
    .join('\n\n');

describe('runQualityChecks', () => {
  test('iyi makale geçer', () => {
    const r = runQualityChecks({ body: goodBody() });
    expect(r.errors.map((e) => e.id)).toEqual([]);
    expect(r.passed).toBe(true);
  });
  test('kısa makale kelime sayısında kalır', () => {
    const r = runQualityChecks({ body: '## A\n\nshort text' });
    expect(r.errors.map((e) => e.id)).toEqual(expect.arrayContaining(['word-count', 'sections', 'code-blocks', 'diagrams']));
  });
  test('eşikler ayarlanabilir', () => {
    const r = runQualityChecks({ body: '## A\n\nshort', thresholds: { minWords: 1, minSections: 1, minCodeBlocks: 0, minDiagrams: 0, requireTable: false } });
    expect(r.passed).toBe(true);
  });
});

describe('kaynaksız sayılar', () => {
  test('izinli metinde geçmeyen yüzde yakalanır', () => {
    expect(findUnsupportedNumbers('It is 40% faster and 3x cheaper.', '')).toEqual([{ text: '40%', strong: true }, { text: '3x', strong: true }]);
  });
  test('izinli metinde geçen sayı serbest', () => {
    expect(findUnsupportedNumbers('Latency dropped by 40%.', 'we measured 40% less latency')).toEqual([]);
  });
  test('kod bloğu ve satır içi kod taranmaz', () => {
    expect(findUnsupportedNumbers('Use `timeout: 500ms`.\n' + fence('js', 'wait(900 ms)'), '')).toEqual([]);
  });
  test('küçük birimler zayıf (warning)', () => {
    expect(findUnsupportedNumbers('It takes 200 ms.', '')).toEqual([{ text: '200 ms', strong: false }]);
  });
});

describe('tekrar ve klişe', () => {
  const p = filler(40, 'same');
  test('neredeyse aynı paragraflar', () => expect(findDuplicateParagraphs(p + '\n\n' + p + ' x')).toHaveLength(1));
  test('farklı paragraflar', () => expect(findDuplicateParagraphs(filler(40, 'a') + '\n\n' + filler(40, 'b'))).toEqual([]));
  test('klişe ve rubric sızıntısı', () => {
    expect(findBannedPhrases('Let us delve into this.')).toContain('delve into');
    expect(findBannedPhrases('A concrete trade-off is latency.').length).toBe(1);
    expect(findBannedPhrases('Plain sentence.')).toEqual([]);
  });
});

describe('unutulmuş işaretler', () => {
  test('düz metinde TODO/FIXME ve yer tutucu yakalanır', () => {
    expect(findLeftovers('Intro. TODO: finish this.\n\nlorem ipsum [...]')).toEqual(['TODO', 'lorem ipsum', '[...]']);
  });
  test('koddaki "todo" değeri ve küçük harfli kelime işaret değildir', () => {
    const body = 'A todo list app.\n\n' + fence('tsx', '<option value="todo">To Do</option>\nconst TODO_STATUS = "todo";');
    expect(findLeftovers(body)).toEqual([]);
    expect(runQualityChecks({ body: goodBody() + '\n\n' + body }).errors.map((e) => e.id)).not.toContain('leftovers');
  });
  test('kodda yorum olarak TODO yakalanır', () => {
    expect(findLeftovers(fence('js', 'run(); // TODO handle errors') + '\n\n' + fence('python', '# FIXME: retry'))).toEqual(['// TODO', '# FIXME']);
  });
});

describe('olgu doğrulama', () => {
  const source = 'PostgreSQL uses MVCC to let readers not block writers. Vacuum reclaims dead tuples.';
  test('birebir alıntı kabul, uydurma red', () => {
    expect(quoteInSource('uses MVCC to let readers not block writers', source)).toBe(true);
    expect(quoteInSource('uses MVCC to let writers block readers', source)).toBe(false);
    expect(quoteInSource('too short', source)).toBe(false);
  });
  test('verifyFacts yalnız doğrulananları döndürür', () => {
    const facts = [{ claim: 'MVCC', quote: 'uses MVCC to let readers not block writers' }, { claim: 'fake', quote: 'invented quote that is not in the source text' }];
    expect(verifyFacts(facts, source)).toHaveLength(1);
  });
  test('buildBrief global id atar ve sınırlar', () => {
    const brief = buildBrief([{ url: 'u1', title: 't1', kind: 'web', facts: [{ claim: 'a', quote: 'qa' }, { claim: 'b', quote: 'qb' }] }], { maxFacts: 1 });
    expect(brief.facts).toEqual([{ id: 'F1', claim: 'a', quote: 'qa', sourceUrl: 'u1', sourceTitle: 't1' }]);
    expect(allowedTextOf(brief, 'note 5%')).toContain('note 5%');
  });
});

describe('konu ve aşama kuralları', () => {
  test('dedupKeyOf', () => expect(dedupKeyOf('  Hello,  World!! ')).toBe('hello world'));
  test('konu geçişleri', () => {
    expect(canTransitionTopic('suggested', 'approved')).toBe(true);
    expect(canTransitionTopic('suggested', 'used')).toBe(false);
    expect(canTransitionTopic('drafting', 'approved')).toBe(true);
  });
  test('nextStageAfter', () => {
    expect(nextStageAfter(null)).toBe('research');
    expect(nextStageAfter('score')).toBe('assets');
    expect(nextStageAfter('final')).toBeNull();
  });
});
