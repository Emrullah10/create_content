import axios from 'axios';
import { API } from '@shared/constant/api-constant';

// Kimlik dogrulama yok (tek kullanicili yerel arac); servis Host/Origin denetimi yapar, CORS yok (Vite proxy ayni origin).
const http = axios.create({ baseURL: API, timeout: 60_000, headers: { Accept: 'application/json' } });

// Elle yazilan uclar { success, data } doner (data'yi acariz); auto-CRUD uclari ham dizi doner (oldugu gibi).
export const unwrap = (response) => {
  const body = response.data;
  return body && typeof body === 'object' && !Array.isArray(body) && 'success' in body ? body.data : body;
};

export default http;
