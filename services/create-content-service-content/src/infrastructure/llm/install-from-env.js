import { makeOpenAiCompatibleAdapter } from './openai-compatible.adapter.js';
import { setLlmProvider } from './llm-port.js';
import { makeFakeLlm } from './fake.adapter.js';

const ROLES = ['writer', 'judge', 'utility'];
const PLACEHOLDER = /^(your-|changeme|<)/i;
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

// Rol yapilandirmasi: LLM_<ROL>_{BASE_URL,API_KEY,MODEL,JSON_MODE,TIMEOUT_MS,MAX_TOKENS}. judge/utility eksik
// alanlari writer'dan miras alir (yalniz MODEL farkli verilebilir). Writer eksik/sablon degerliyse YAPILANDIRILMAMIS sayilir:
// servis yine acilir (panel calisir), pipeline LLM_NOT_CONFIGURED ile durur. Sessizce yanlis calismaz.
export const readRolesFromEnv = (env = process.env) => {
  const pick = (role, key) => env[`LLM_${role.toUpperCase()}_${key}`]?.trim() || undefined;
  const writer = {
    baseUrl: pick('writer', 'BASE_URL'),
    apiKey: pick('writer', 'API_KEY'),
    model: pick('writer', 'MODEL'),
    jsonMode: pick('writer', 'JSON_MODE') || 'json_object',
    timeoutMs: num(pick('writer', 'TIMEOUT_MS'), 300_000),
    maxTokens: num(pick('writer', 'MAX_TOKENS'), 4096),
  };
  const roles = { writer };
  for (const role of ROLES.filter((r) => r !== 'writer')) {
    roles[role] = {
      baseUrl: pick(role, 'BASE_URL') ?? writer.baseUrl,
      apiKey: pick(role, 'API_KEY') ?? writer.apiKey,
      model: pick(role, 'MODEL') ?? writer.model,
      jsonMode: pick(role, 'JSON_MODE') ?? writer.jsonMode,
      timeoutMs: num(pick(role, 'TIMEOUT_MS'), writer.timeoutMs),
      maxTokens: num(pick(role, 'MAX_TOKENS'), writer.maxTokens),
    };
  }
  return roles;
};

export const installLlmFromEnv = ({ env = process.env, recorder, logger = console } = {}) => {
  if (env.LLM_PROVIDER === 'fake') {
    // Sahte adaptor uretimde KURULMAYI REDDEDER: sessizce sahte makale uretmek en kotu hata olurdu.
    if (env.NODE_ENV === 'production') throw new Error('LLM_PROVIDER=fake is not allowed in production');
    setLlmProvider(makeFakeLlm({ recorder }));
    return { configured: true, provider: 'fake' };
  }
  const roles = readRolesFromEnv(env);
  const w = roles.writer;
  if (!w.baseUrl || !w.apiKey || !w.model || PLACEHOLDER.test(w.apiKey)) {
    setLlmProvider(null);
    logger.warn?.('[llm] LLM_WRITER_* is not configured: article generation is disabled until it is set in .env');
    return { configured: false, provider: null };
  }
  setLlmProvider(makeOpenAiCompatibleAdapter({ roles, recorder }));
  return { configured: true, provider: 'openai-compatible', roles };
};
