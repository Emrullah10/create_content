// snake_case (DB) <-> camelCase (JS) donusumu icin kucuk yardimcilar

export const toCamel = (row) => {
  if (!row) return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camelKey] = value;
  }
  return out;
};

export const toSnakeKey = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export const buildUpdateSet = (patch, startIndex = 1) => {
  const keys = Object.keys(patch);
  const setClauses = keys.map((k, i) => `${toSnakeKey(k)} = $${i + startIndex}`);
  const values = keys.map((k) => patch[k]);
  return { setClauses, values };
};
