import { InfrastructureError } from '../../domain/errors/infrastructure-error.js';

// PORT: LLM cagrilari bu arayuzden gecer. Durum SUREC-ICIDIR; porta dokunan her surec boot.js'te kurulum yapar.
// Gercek adaptor (openai-compatible) install-from-env ile kurulur; sahte adaptor yalniz LLM_PROVIDER=fake ile.
//   complete({ role, stage, system, prompt, schema?, temperature?, maxTokens?, articleId? })
//     -> { text, data?, usage:{inputTokens,outputTokens}, model, durationMs }
let impl = null;

export const setLlmProvider = (provider) => {
  impl = provider;
};
export const isLlmConfigured = () => impl !== null;
export const describeLlm = () => impl?.describe?.() ?? null;

export const llm = {
  complete: (request) => {
    if (!impl) throw new InfrastructureError('LLM_NOT_CONFIGURED', 'No LLM provider is configured (set LLM_WRITER_* in .env)');
    return impl.complete(request);
  },
};
