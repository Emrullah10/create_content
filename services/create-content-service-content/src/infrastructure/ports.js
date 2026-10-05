import { InfrastructureError } from '../domain/errors/infrastructure-error.js';

// Port kayit defteri (LLM haric: o kendi port dosyasinda). Durum SUREC-ICIDIR; porta dokunan surec boot.js'te kurulum yapar.
// Container lazy delegasyon kullanir: kurulmamis bir port yalniz KULLANILDIGINDA PORT_NOT_CONFIGURED verir, servis yine acilir.
const registry = new Map();

export const setPort = (name, impl, label = 'custom') => {
  if (impl) registry.set(name, { impl, label });
  else registry.delete(name);
};
export const getPort = (name) => {
  const entry = registry.get(name);
  if (!entry) throw new InfrastructureError('PORT_NOT_CONFIGURED', `Port "${name}" is not configured (check .env)`);
  return entry.impl;
};
export const isPortInstalled = (name) => registry.has(name);
export const describePorts = () => Object.fromEntries([...registry].map(([name, { label }]) => [name, label]));

export const lazyPort = (name, methods) => Object.fromEntries(methods.map((m) => [m, (...args) => getPort(name)[m](...args)]));

// Kapanista: tarayici gibi sistem kaynaklarini birakan portlar.
export const shutdownPorts = async () => {
  for (const { impl } of registry.values()) await impl.closeBrowser?.().catch(() => {});
};
