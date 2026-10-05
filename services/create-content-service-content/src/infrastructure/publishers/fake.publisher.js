// Test/E2E: dev.to'yu taklit eder (bellekte). `failNext` ile "5xx ama yayin yapildi" gibi belirsiz hatalar simule edilir.
export const makeFakePublisher = () => {
  const articles = [];
  const state = { failNext: null, calls: [] };
  const track = (m, a) => state.calls.push([m, a]);
  const maybeFail = (phase) => {
    if (state.failNext && state.failNext.phase === phase) {
      const err = Object.assign(new Error(`fake dev.to ${state.failNext.status}`), { status: state.failNext.status });
      const persist = state.failNext.persist;
      state.failNext = null;
      return { err, persist };
    }
    return null;
  };
  const publisher = {
    create: async (payload) => {
      track('create', payload);
      const fail = maybeFail('create');
      const record = { id: String(1000 + articles.length), url: `https://dev.to/fake/${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${1000 + articles.length}`, title: payload.title, published: payload.published, payload };
      if (!fail || fail.persist) articles.push(record);
      if (fail) throw fail.err;
      return { id: record.id, url: record.url, published: record.published };
    },
    update: async (id, payload) => {
      track('update', payload);
      const hit = articles.find((a) => a.id === id);
      if (!hit) throw Object.assign(new Error('fake dev.to 404'), { status: 404 });
      Object.assign(hit, { title: payload.title, published: payload.published, payload });
      return { id: hit.id, url: hit.url, published: hit.published };
    },
    listMine: async () => articles.map((a) => ({ id: a.id, url: a.url, published: a.published })),
    findByTitle: async (title) => {
      track('findByTitle', title);
      const hit = articles.find((a) => a.title === title);
      return hit ? { id: hit.id, url: hit.url, published: hit.published } : null;
    },
  };
  return { publisher, articles, state };
};
