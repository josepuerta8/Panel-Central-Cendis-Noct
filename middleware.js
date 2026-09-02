// middleware.js — protege TODO el sitio (panel + /api/update) con un usuario y
// contraseña compartidos, vía HTTP Basic Auth. El navegador solo pide la
// contraseña una vez y la recuerda para el resto de la sesión en esa pestaña,
// incluyendo las llamadas de fetch a /api/update.
//
// Variables de entorno (Vercel → Project Settings → Environment Variables):
//   SITE_USER      - usuario (opcional, default "cendis")
//   SITE_PASSWORD  - contraseña (obligatoria; sin ella el sitio queda abierto)

export const config = {
  matcher: ['/((?!favicon.ico).*)']
};

export default function middleware(request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return; // sin contraseña configurada: no bloquea nada

  const user = process.env.SITE_USER || 'cendis';
  const auth = request.headers.get('authorization');

  if (auth && auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const sep = decoded.indexOf(':');
      const u = decoded.slice(0, sep);
      const p = decoded.slice(sep + 1);
      if (u === user && p === password) {
        return; // credenciales correctas, deja pasar la petición
      }
    } catch {
      // credenciales mal formadas, cae al 401 de abajo
    }
  }

  return new Response('Autenticación requerida', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Panel Central CENDIS"' }
  });
}
