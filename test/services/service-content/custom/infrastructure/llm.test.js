import { describe, test, expect, jest } from '@jest/globals';
import { z } from 'zod';
import { makeOpenAiCompatibleAdapter, extractJson, stripReasoning } from '../../../../../services/create-content-service-content/src/infrastructure/llm/openai-compatible.adapter.js';
import { installLlmFromEnv, readRolesFromEnv } from '../../../../../services/create-content-service-content/src/infrastructure/llm/install-from-env.js';
import { llm, isLlmConfigured, setLlmProvider } from '../../../../../services/create-content-service-content/src/infrastructure/llm/llm-port.js';
import { renderPrompt, promptVariables } from '../../../../../services/create-content-service-content/src/infrastructure/llm/prompt-loader.js';
import { withRetry } from '../../../../../services/create-content-service-content/src/infrastructure/helper/retry.js';
import { parseRetryAfter } from '../../../../../services/create-content-service-content/src/infrastructure/helper/retry-after-parser.js';
import { makeRateLimiter } from '../../../../../services/create-content-service-content/src/infrastructure/helper/rate-limiter.js';

const roles = { writer: { baseUrl: 'http://w', apiKey: 'k', model: 'm-writer', jsonMode: 'json_object', timeoutMs: 1000 } };
const reply = (content, finish = 'stop') => ({ model: 'm-writer', choices: [{ message: { content }, finish_reason: finish }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
const adapterWith = (create, extra = {}) => makeOpenAiCompatibleAdapter({ roles, clientFactory: () => ({ chat: { completions: { create } } }), sleep: async () => {}, ...extra });
const Schema = z.object({ a: z.number() });

describe('extractJson / stripReasoning', () => {
  test('kod çitini ve çevre metni atar', () => expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 }));
  test('<think> bloğu temizlenir', () => expect(stripReasoning('<think>hmm</think>\nanswer')).toBe('answer'));
  test('JSON yoksa hata', () => expect(() => extractJson('no json')).toThrow(/no JSON/));
});

describe('openai-compatible adapter', () => {
  test('metin: kullanım ve model döner, recorder çağrılır', async () => {
    const recorder = jest.fn();
    const create = jest.fn(async () => reply('hello'));
    const out = await adapterWith(create, { recorder }).complete({ stage: 's', prompt: 'p', articleId: 7 });
    expect(out).toMatchObject({ text: 'hello', usage: { inputTokens: 10, outputTokens: 5 }, model: 'm-writer' });
    expect(recorder).toHaveBeenCalledWith(expect.objectContaining({ role: 'writer', stage: 's', articleId: 7, status: 'ok', inputTokens: 10 }));
  });

  test('json_object modu: response_format gönderilir, şema talimatı prompt\'a eklenir, veri doğrulanır', async () => {
    const create = jest.fn(async () => reply('{"a": 3}'));
    const out = await adapterWith(create).complete({ prompt: 'p', schema: Schema });
    expect(out.data).toEqual({ a: 3 });
    const body = create.mock.calls[0][0];
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages.at(-1).content).toContain('JSON Schema');
  });

  test('json_schema modu: şema response_format ile gider', async () => {
    const create = jest.fn(async () => reply('{"a": 1}'));
    const a = makeOpenAiCompatibleAdapter({ roles: { writer: { ...roles.writer, jsonMode: 'json_schema' } }, clientFactory: () => ({ chat: { completions: { create } } }) });
    await a.complete({ prompt: 'p', schema: Schema, schemaName: 'x' });
    expect(create.mock.calls[0][0].response_format.type).toBe('json_schema');
  });

  test('geçersiz JSON: hata mesajıyla tek düzeltme turu, token toplanır', async () => {
    const create = jest.fn().mockResolvedValueOnce(reply('{"a": "nope"}')).mockResolvedValueOnce(reply('{"a": 2}'));
    const out = await adapterWith(create).complete({ prompt: 'p', schema: Schema });
    expect(out.data).toEqual({ a: 2 });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0].messages.at(-1).content).toContain('previous answer was invalid');
    expect(out.usage.inputTokens).toBe(20);
  });

  test('iki kez geçersiz: LLM_INVALID_JSON', async () => {
    const create = jest.fn(async () => reply('garbage'));
    await expect(adapterWith(create).complete({ prompt: 'p', schema: Schema })).rejects.toMatchObject({ code: 'LLM_INVALID_JSON' });
  });

  test('kesilmiş çıktı (finish_reason=length) LLM_TRUNCATED', async () => {
    await expect(adapterWith(async () => reply('partial', 'length')).complete({ prompt: 'p' })).rejects.toMatchObject({ code: 'LLM_TRUNCATED' });
  });

  test('429 yeniden denenir, 400 denenmez', async () => {
    const err429 = Object.assign(new Error('rate'), { status: 429, headers: { 'retry-after': '1' } });
    const create = jest.fn().mockRejectedValueOnce(err429).mockResolvedValueOnce(reply('ok'));
    expect((await adapterWith(create).complete({ prompt: 'p' })).text).toBe('ok');
    const bad = jest.fn().mockRejectedValue(Object.assign(new Error('bad'), { status: 400 }));
    await expect(adapterWith(bad).complete({ prompt: 'p' })).rejects.toThrow('bad');
    expect(bad).toHaveBeenCalledTimes(1);
  });

  test('rol yapılandırılmamışsa writer\'a düşer', async () => {
    const create = jest.fn(async () => reply('x'));
    await adapterWith(create).complete({ role: 'judge', prompt: 'p' });
    expect(create.mock.calls[0][0].model).toBe('m-writer');
  });
});

describe('dusunen modeller ve saglayiciya ozel alanlar', () => {
  test('kesilen cikti: butce buyutulup BIR KEZ tekrar denenir', async () => {
    const create = jest.fn().mockResolvedValueOnce(reply('partial thinking...', 'length')).mockResolvedValueOnce(reply('final answer'));
    const out = await adapterWith(create).complete({ prompt: 'p', maxTokens: 1000 });
    expect(out.text).toBe('final answer');
    expect(create.mock.calls[0][0].max_tokens).toBe(1000);
    expect(create.mock.calls[1][0].max_tokens).toBe(1800);
  });
  test('ikinci kesilme hata verir (sonsuz dongu yok)', async () => {
    const create = jest.fn(async () => reply('partial', 'length'));
    await expect(adapterWith(create).complete({ prompt: 'p', maxTokens: 1000 })).rejects.toMatchObject({ code: 'LLM_TRUNCATED' });
    expect(create).toHaveBeenCalledTimes(2);
  });
  test('extraBody istege eklenir ama cekirdek alanlari ezmez', async () => {
    const create = jest.fn(async () => reply('ok'));
    const a = makeOpenAiCompatibleAdapter({ roles: { writer: { ...roles.writer, extraBody: { chat_template_kwargs: { enable_thinking: false }, model: 'EVIL' } } }, clientFactory: () => ({ chat: { completions: { create } } }) });
    await a.complete({ prompt: 'p' });
    expect(create.mock.calls[0][0]).toMatchObject({ model: 'm-writer', chat_template_kwargs: { enable_thinking: false } });
  });
  test('LLM_<ROL>_EXTRA_BODY okunur; gecersiz JSON uyarilir; rol basina, miras alinmaz', () => {
    const warn = jest.fn();
    const r = readRolesFromEnv({ LLM_WRITER_BASE_URL: 'http://w', LLM_WRITER_API_KEY: 'k', LLM_WRITER_MODEL: 'm', LLM_WRITER_EXTRA_BODY: '{"a":1}', LLM_JUDGE_EXTRA_BODY: 'not json' }, { warn });
    expect(r.writer.extraBody).toEqual({ a: 1 });
    expect(r.judge.extraBody).toBeUndefined();
    expect(r.utility.extraBody).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('LLM_JUDGE_EXTRA_BODY'));
  });
});

describe('install-from-env', () => {
  const env = { LLM_WRITER_BASE_URL: 'http://w', LLM_WRITER_API_KEY: 'real-key', LLM_WRITER_MODEL: 'big', LLM_UTILITY_MODEL: 'small' };
  test('judge/utility eksik alanları writer\'dan miras alır, model ayrı verilebilir', () => {
    const r = readRolesFromEnv(env);
    expect(r.utility).toMatchObject({ baseUrl: 'http://w', apiKey: 'real-key', model: 'small', jsonMode: 'json_object' });
    expect(r.judge.model).toBe('big');
  });
  test('şablon/boş anahtar: yapılandırılmamış, pipeline LLM_NOT_CONFIGURED', () => {
    const logger = { warn: jest.fn() };
    expect(installLlmFromEnv({ env: { ...env, LLM_WRITER_API_KEY: 'your-nvidia-api-key-here' }, logger }).configured).toBe(false);
    expect(isLlmConfigured()).toBe(false);
    expect(() => llm.complete({ prompt: 'p' })).toThrow(/No LLM provider/);
    expect(logger.warn).toHaveBeenCalled();
  });
  test('geçerli yapılandırma kurulur', () => {
    expect(installLlmFromEnv({ env, logger: console }).configured).toBe(true);
    expect(isLlmConfigured()).toBe(true);
    setLlmProvider(null);
  });
  test('LLM_PROVIDER=fake üretimde REDDEDİLİR, aksi halde kurulur', () => {
    expect(() => installLlmFromEnv({ env: { LLM_PROVIDER: 'fake', NODE_ENV: 'production' } })).toThrow(/not allowed in production/);
    expect(installLlmFromEnv({ env: { LLM_PROVIDER: 'fake', NODE_ENV: 'test' } }).provider).toBe('fake');
    setLlmProvider(null);
  });
});

describe('prompt-loader', () => {
  test('tüm değişkenler verilince render eder', () => {
    const vars = Object.fromEntries(promptVariables('code-fix').map((v) => [v, `<${v}>`]));
    expect(renderPrompt('code-fix', vars)).toContain('<error>');
  });
  test('eksik değişken hata verir', () => expect(() => renderPrompt('code-fix', { language: 'js' })).toThrow(/missing variables/));
  test('değerin içindeki {{x}} yeniden yorumlanmaz', () => {
    const vars = Object.fromEntries(promptVariables('cover').map((v) => [v, '{{cover_prompt}}']));
    expect(renderPrompt('cover', vars)).toContain('{{cover_prompt}}');
  });
  test('her prompt dosyası yüklenebilir', () => {
    for (const n of ['system-writer', 'topics', 'research-plan', 'research-facts', 'outline', 'section', 'editor', 'revise-section', 'judge', 'code-fix', 'diagram-repair', 'cover']) expect(promptVariables(n)).toBeInstanceOf(Array);
  });
});

describe('retry / rate limit yardımcıları', () => {
  test('withRetry: delayMs ustel bekleyişin yerine geçer, shouldRetry=false hemen fırlatır', async () => {
    const sleep = jest.fn(async () => {});
    let n = 0;
    await withRetry(async () => { n += 1; if (n < 2) throw new Error('x'); }, { attempts: 3, delayMs: () => 123, sleep });
    expect(sleep).toHaveBeenCalledWith(123);
    await expect(withRetry(async () => { throw new Error('perm'); }, { shouldRetry: () => false, sleep })).rejects.toThrow('perm');
  });
  test('parseRetryAfter saniye / HTTP-date / yok', () => {
    expect(parseRetryAfter('30')).toBe(30000);
    expect(parseRetryAfter(new Date(Date.now() + 60000).toUTCString())).toBeGreaterThan(0);
    expect(parseRetryAfter(undefined)).toBeNull();
  });
  test('rate limiter pencere dolunca bekler', async () => {
    let t = 0;
    const sleeps = [];
    const rl = makeRateLimiter({ maxRequests: 2, windowMs: 1000, now: () => t, sleep: async (ms) => { sleeps.push(ms); t += ms; } });
    await rl.acquire(); await rl.acquire(); await rl.acquire();
    expect(sleeps).toEqual([1000]);
  });
});

describe('outline kapak istemi kuralı', () => {
  test('diyagram/yazı anlatan kapak istemi reddedilir, metafor kabul edilir', async () => {
    const { OutlineSchema, COVER_FORBIDDEN } = await import('../../../../../services/create-content-service-content/src/infrastructure/llm/schemas.js');
    const { makeFakeLlm } = await import('../../../../../services/create-content-service-content/src/infrastructure/llm/fake.adapter.js');
    const base = (await makeFakeLlm().complete({ stage: 'outline', prompt: 'x', schema: OutlineSchema, meta: { title: 'T' } })).data;
    expect(OutlineSchema.safeParse(base).success).toBe(true);
    for (const bad of ['A split diagram showing readers and writers', 'A dashboard with charts', 'Server with the label MVCC', 'A flowchart of vacuum']) {
      expect(COVER_FORBIDDEN.test(bad)).toBe(true);
      expect(OutlineSchema.safeParse({ ...base, coverPrompt: bad }).success).toBe(false);
    }
    expect(OutlineSchema.safeParse({ ...base, coverPrompt: 'Two glass highways with glowing cars and a road crew sweeping leaves' }).success).toBe(true);
  });
});
