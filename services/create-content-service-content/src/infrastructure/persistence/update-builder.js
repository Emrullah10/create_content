// Allow-list'li UPDATE uretici. Istemci anahtarlari SQL'e ASLA sizmaz: yalniz `columns` haritasindaki
// (camelCase anahtar -> SQL kolon) alanlar yazilir. JSONB kolonlar JSON.stringify ile gider.
// Audit kolonlari (<prefix>_updated_by/_updated_at) otomatik yazilir.
export const makeUpdater = ({ table, keyColumn, columns, jsonColumns = [], prefix }) => {
  const json = new Set(jsonColumns);
  return ({ key, patch, userId = null, now = new Date() }) => {
    const sets = [];
    const params = [key];
    for (const [name, column] of Object.entries(columns)) {
      if (patch[name] === undefined) continue;
      params.push(json.has(column) ? JSON.stringify(patch[name]) : patch[name]);
      sets.push(`${column} = $${params.length}${json.has(column) ? '::jsonb' : ''}`);
    }
    if (!sets.length) return null;
    params.push(userId, now);
    sets.push(`${prefix}_updated_by = $${params.length - 1}`, `${prefix}_updated_at = $${params.length}`);
    return { sql: `UPDATE ${table} SET ${sets.join(', ')} WHERE ${keyColumn} = $1`, params };
  };
};

export const withTx = (rawQuery) => (tx) => (tx ? (sql, params) => tx.query(sql, params) : rawQuery);
