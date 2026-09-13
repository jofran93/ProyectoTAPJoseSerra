// Middlewares de autenticación/autorización basados en sesión (req.session.usuario).

const DESTINO_POR_ROL = require('../rolDestinos');

function requireAuth(req, res, next) {
  if (!req.session.usuario) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.usuario) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'No autenticado' });
      }
      return res.redirect('/login');
    }
    if (!roles.includes(req.session.usuario.rol)) {
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ error: 'No tienes permiso para esta acción' });
      }
      // No es un error de "no autenticado": está logueado, solo que esta vista no es
      // la suya. Lo mandamos a su propia vista en vez de mostrarle un 403 pelado.
      return res.redirect(DESTINO_POR_ROL[req.session.usuario.rol] || '/login');
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
