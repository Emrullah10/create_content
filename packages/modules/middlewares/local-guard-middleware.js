// Gateway yok: servis loopback'e baglanir, ama tarayici uzerinden gelen saldirilari (DNS rebinding,
// baska sitenin form/fetch ile POST atmasi) burada keseriz. CORS basligi HIC yazilmaz; panel ayni
// origin'e Vite proxy ile gider.
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export default (config) => {
  const port = String(config.port);
  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`, ...(config.extraHosts || [])]);
  const origins = new Set(
    String(process.env.PANEL_ORIGINS || 'http://127.0.0.1:5174,http://localhost:5174')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return (req, res, next) => {
    // Vite proxy changeOrigin:true Host'u hedefe cevirir; dogrudan istekler de ayni listede.
    if (!hosts.has(String(req.headers.host || ''))) {
      return res.status(403).json({ success: false, error: { code: 'HOST_NOT_ALLOWED', message: 'Host not allowed' } });
    }
    const origin = req.headers.origin;
    if (UNSAFE.has(req.method) && origin && !origins.has(origin)) {
      return res.status(403).json({ success: false, error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Origin not allowed' } });
    }
    return next();
  };
};
