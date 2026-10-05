import crypto from 'node:crypto';

// Tek kullanicili panel girisi. PANEL_PASSWORD TANIMSIZSA kapali (yerel gelistirme); tanimliysa /api altindaki her sey oturum ister.
// Oturum: HttpOnly + SameSite=Strict cerezde `<bitis>.<hmac>` (sunucu tarafi durum/Redis yok). Env cagri aninda okunur.
const COOKIE = 'cc_session';
const TTL_MS = 7 * 24 * 3600 * 1000;
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 60_000;

const sha = (v) => crypto.createHash('sha256').update(String(v)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const secret = () => process.env.PANEL_SESSION_SECRET || `panel:${process.env.PANEL_PASSWORD}`;
const sign = (exp) => crypto.createHmac('sha256', secret()).update(String(exp)).digest('hex');

const readCookie = (req) => {
  const m = String(req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? m[1] : null;
};
const isValid = (token) => {
  const [exp, mac] = String(token || '').split('.');
  return Boolean(exp && mac && Number(exp) > Date.now() && safeEqual(mac, sign(exp)));
};
const setCookie = (req, res, value, maxAgeSec) => {
  const secure = req.headers['x-forwarded-proto'] === 'https' || req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${secure}`);
};
const fail = (res, status, code, message) => res.status(status).json({ success: false, error: { code, message } });

export default (config) => {
  const mount = `${config.basePathPrefix || '/api'}${config.basePath || ''}`;
  const fails = new Map(); // ip -> { count, resetAt }

  return (req, res, next) => {
    const password = process.env.PANEL_PASSWORD;
    const path = req.path.replace(/\/+$/, '');

    if (path === `${mount}/auth/session` && req.method === 'GET') {
      return res.json({ success: true, data: { authRequired: Boolean(password), authenticated: !password || isValid(readCookie(req)) } });
    }
    if (!password) return next();

    if (path === `${mount}/auth/login` && req.method === 'POST') {
      const ip = req.socket?.remoteAddress || 'none';
      const rec = fails.get(ip);
      if (rec && rec.resetAt > Date.now() && rec.count >= MAX_FAILS) return fail(res, 429, 'LOGIN_RATE_LIMITED', 'Too many attempts');
      if (typeof req.body?.password !== 'string' || !safeEqual(req.body.password, password)) {
        const cur = rec && rec.resetAt > Date.now() ? rec : { count: 0, resetAt: Date.now() + FAIL_WINDOW_MS };
        fails.set(ip, { ...cur, count: cur.count + 1 });
        return fail(res, 401, 'LOGIN_INVALID', 'Invalid password');
      }
      fails.delete(ip);
      const exp = Date.now() + TTL_MS;
      setCookie(req, res, `${exp}.${sign(exp)}`, TTL_MS / 1000);
      return res.json({ success: true, data: { authenticated: true } });
    }
    if (path === `${mount}/auth/logout` && req.method === 'POST') {
      setCookie(req, res, '', 0);
      return res.json({ success: true, data: { authenticated: false } });
    }

    // Saglik ucu (izleme) ve API disi yollar acik; diger her API istegi oturum ister.
    if (!req.path.startsWith('/api/') || path === `${mount}/app/health` || path === '/api/online') return next();
    if (isValid(readCookie(req))) return next();
    return fail(res, 401, 'UNAUTHENTICATED', 'Sign in required');
  };
};
