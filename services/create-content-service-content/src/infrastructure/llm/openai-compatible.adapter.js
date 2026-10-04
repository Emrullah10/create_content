import OpenAI from 'openai';
import { z } from 'zod';
import { InfrastructureError } from '../../domain/errors/infrastructure-error.js';
import { withRetry } from '../helper/retry.js';
import { parseRetryAfter } from '../helper/retry-after-parser.js';

// Rol bazli OpenAI-uyumlu adaptor (NVIDIA NIM, Ollama, LM Studio, OpenRouter...).
// roles: { writer:{baseUrl,apiKey,model,jsonMode,timeoutMs,maxTokens}, judge:{...}, utility:{...} }
// jsonMode: 'json_object' | 'json_schema' | 'none'  (saglayici basina farkli: LM Studio json_schema ister)

const THINK_TAGS = /<think>[\s\S]*?<\/think>/gi;

export const stripReasoning = (text) => text.replace(THINK_TAGS, '').trim();

// Kod citlari ve etraftaki metni atip ilk { ... son } araligini ayristirir.
export const extractJson = (text) => {
  const cleaned = stripReasoning(text).replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object found in model output');
  return JSON.parse(cleaned.slice(start, end + 1));
};

const schemaInstruction = (schema) =>
  `\n\nRespond with ONE JSON object only (no prose, no code fences) that validates against this JSON Schema:\n${JSON.stringify(z.toJSONSchema(schema))}`;

const retryable = (err) => {
  const status = err?.status;
  if (status === undefined) return err?.name !== 'InfrastructureError'; // ag / zaman asimi
  return status === 408 || status === 409 || status === 429 || status >= 500;
};

export const makeOpenAiCompatibleAdapter = ({ roles, clientFactory = (cfg) => new OpenAI({ baseURL: cfg.baseUrl, apiKey: cfg.apiKey, timeout: cfg.timeoutMs, maxRetries: 0 }), recorder, sleep } = {}) => {
  if (!roles?.writer) throw new Error('openai-compatible adapter requires a writer role');
  const clients = new Map();
  const configOf = (role) => roles[role] ?? roles.writer;
  const clientOf = (role) => {
    const cfg = configOf(role);
    const key = `${cfg.baseUrl}|${cfg.apiKey}`;
    if (!clients.has(key)) clients.set(key, clientFactory(cfg));
    return clients.get(key);
  };

  const callOnce = async ({ role, system, prompt, schema, schemaName, temperature, maxTokens }) => {
    const cfg = configOf(role);
    const withSchema = schema && cfg.jsonMode !== 'json_schema';
    const body = {
      model: cfg.model,
      temperature,
      max_tokens: maxTokens ?? cfg.maxTokens ?? 4096,
      messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt + (withSchema ? schemaInstruction(schema) : '') }],
    };
    if (schema && cfg.jsonMode === 'json_object') body.response_format = { type: 'json_object' };
    if (schema && cfg.jsonMode === 'json_schema') body.response_format = { type: 'json_schema', json_schema: { name: schemaName || 'result', schema: z.toJSONSchema(schema), strict: false } };

    const res = await clientOf(role).chat.completions.create(body);
    const choice = res.choices?.[0];
    if (choice?.finish_reason === 'length') throw new InfrastructureError('LLM_TRUNCATED', `output truncated at max_tokens (${body.max_tokens}); raise maxTokens or shorten the request`);
    const text = stripReasoning(choice?.message?.content ?? '');
    if (!text) throw new InfrastructureError('LLM_EMPTY_RESPONSE', 'model returned an empty response');
    return { text, usage: { inputTokens: res.usage?.prompt_tokens ?? null, outputTokens: res.usage?.completion_tokens ?? null }, model: res.model || cfg.model };
  };

  const complete = async (request) => {
    const role = request.role || 'writer';
    const started = Date.now();
    const temperature = request.temperature ?? 0.7;
    const record = async (extra) => {
      try {
        await recorder?.({ role, stage: request.stage ?? null, articleId: request.articleId ?? null, model: configOf(role).model, durationMs: Date.now() - started, ...extra });
      } catch {
        /* kayit best-effort */
      }
    };
    try {
      const run = (extra = '', temp = temperature) =>
        withRetry(() => callOnce({ ...request, role, prompt: request.prompt + extra, temperature: temp }), {
          attempts: 4,
          baseDelayMs: 2000,
          shouldRetry: retryable,
          delayMs: (err) => parseRetryAfter(err?.headers?.['retry-after']) ?? undefined,
          sleep,
        });

      let out = await run();
      let data;
      if (request.schema) {
        try {
          data = request.schema.parse(extractJson(out.text));
        } catch (firstError) {
          // Tek duzeltme turu: hatayi modele geri besle, sicakligi dusur.
          const detail = firstError instanceof z.ZodError ? z.prettifyError(firstError) : firstError.message;
          const second = await run(`\n\nYour previous answer was invalid: ${detail}\nReturn corrected JSON only.`, Math.min(temperature, 0.2));
          try {
            data = request.schema.parse(extractJson(second.text));
          } catch (secondError) {
            throw new InfrastructureError('LLM_INVALID_JSON', `model did not return valid JSON after a retry: ${secondError.message}`);
          }
          out = { ...second, usage: { inputTokens: (out.usage.inputTokens ?? 0) + (second.usage.inputTokens ?? 0), outputTokens: (out.usage.outputTokens ?? 0) + (second.usage.outputTokens ?? 0) } };
        }
      }
      const result = { ...out, data, durationMs: Date.now() - started };
      await record({ status: 'ok', inputTokens: out.usage.inputTokens, outputTokens: out.usage.outputTokens, model: out.model });
      return result;
    } catch (error) {
      await record({ status: 'error', error: error.message });
      throw error;
    }
  };

  const describe = () => Object.fromEntries(['writer', 'judge', 'utility'].map((r) => [r, { baseUrl: configOf(r).baseUrl, model: configOf(r).model, jsonMode: configOf(r).jsonMode }]));
  return { complete, describe };
};
