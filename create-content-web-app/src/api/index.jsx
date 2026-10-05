// Tum api/*.js modulleri TEK DUZ nesnede birlesir: fonksiyon adlari modüller arasinda BENZERSIZ olmali.
// Cakisma sessizce son yazani kazandirirdi; burada acikca hata verilir.
const modules = import.meta.glob('./*.js', { eager: true });

const api = {};
for (const [path, mod] of Object.entries(modules)) {
  for (const [name, fn] of Object.entries(mod.default || {})) {
    if (name in api) throw new Error(`api: duplicate function name "${name}" (${path})`);
    api[name] = fn;
  }
}

export default api;
