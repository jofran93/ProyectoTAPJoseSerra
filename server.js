require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const { requireRole } = require('./src/middleware/auth');
const DESTINO_POR_ROL = require('./src/rolDestinos');
const authRoutes = require('./src/routes/auth');
const productosRoutes = require('./src/routes/productos');
const pedidosRoutes = require('./src/routes/pedidos');
const despachoRoutes = require('./src/routes/despacho');
const calidadRoutes = require('./src/routes/calidad');
const inventarioRoutes = require('./src/routes/inventario');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const VIEWS_DIR = path.join(__dirname, 'views');

// En hosting (Render/Neon/etc.) la conexión a Postgres va cifrada y con un certificado
// que Node no reconoce como "de confianza" por defecto; en local (docker-compose) no
// hace falta SSL. DB_SSL=true lo activa explícitamente (ver .env.example).
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new pgSession({ pool: pgPool, tableName: 'session', createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }, // 8 horas
  })
);

// Sirve CSS, JS e imágenes estáticas. index:false evita que sirva public/index.html
// (no tiene por qué haber uno) y deja pasar "/" a la lógica de redirección de abajo.
// Las vistas .html viven fuera de public/ (en ./views) para que nunca se sirvan como
// archivo estático crudo: solo se entregan a través de las rutas con requireRole.
app.use(express.static(PUBLIC_DIR, { index: false }));

// --- API ---
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/despacho', despachoRoutes);
app.use('/api/calidad', calidadRoutes);
app.use('/api/inventario', inventarioRoutes);

// --- Vistas (páginas HTML), protegidas según rol ---
// Cada .html vive en ./views (fuera de la carpeta pública) y solo se entrega a través
// de estas rutas: no hay otra forma de llegar a ellas sin pasar por requireRole.
const rutas = {
  '/productos': { archivo: '02-cliente-productos.html', roles: ['CLIENTE'] },
  '/mis-pedidos': { archivo: '09-cliente-pedidos.html', roles: ['CLIENTE'] },
  '/despacho-repartidor': { archivo: '03-despacho-repartidor.html', roles: ['REPARTIDOR'] },
  '/admin/resumen': { archivo: '04-admin-resumen.html', roles: ['ADMIN'] },
  '/admin/pedidos': { archivo: '05-admin-pedidos.html', roles: ['ADMIN'] },
  '/admin/despacho': { archivo: '06-admin-despacho.html', roles: ['ADMIN'] },
  '/admin/calidad': { archivo: '07-admin-calidad.html', roles: ['ADMIN'] },
  '/admin/inventario': { archivo: '08-admin-inventario.html', roles: ['ADMIN'] },
};

for (const [ruta, { archivo, roles }] of Object.entries(rutas)) {
  app.get(ruta, requireRole(...roles), (req, res) => {
    res.sendFile(path.join(VIEWS_DIR, archivo));
  });
}

// Login: si ya hay sesión activa, no tiene sentido mostrarlo de nuevo.
app.get('/login', (req, res) => {
  if (req.session.usuario) {
    return res.redirect(DESTINO_POR_ROL[req.session.usuario.rol] || '/');
  }
  res.sendFile(path.join(VIEWS_DIR, '01-login.html'));
});

// Página de inicio: manda a la vista del rol de la sesión activa, o al login.
app.get('/', (req, res) => {
  const usuario = req.session.usuario;
  res.redirect(usuario ? DESTINO_POR_ROL[usuario.rol] || '/login' : '/login');
});

app.listen(PORT, () => {
  console.log(`Aguas corriendo en http://localhost:${PORT}`);
});
