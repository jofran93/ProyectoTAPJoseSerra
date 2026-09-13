# Aguas — Portal Agua El Gallo

Sistema Node.js (Express) + PostgreSQL (Prisma) que implementa el portal "Agua El Gallo":
login por rol, catálogo y pedidos de cliente, despacho de repartidor, y panel de
administración (resumen, pedidos, despacho, calidad e inventario) con datos reales en
base de datos — no maquetas estáticas.

## Requisitos previos

- **Node.js 18 o superior** (incluye `npm`).
  ```bash
  node -v
  npm -v
  ```
- **Docker** (para levantar PostgreSQL vía `docker-compose.yml`). Si prefieres usar un
  Postgres propio, ajusta `DATABASE_URL` en `.env` y omite el paso de `docker compose up`.

## Instrucciones para ejecutarlo en local

1. **Instala las dependencias**:
   ```bash
   npm install
   ```
2. **Copia el archivo de variables de entorno**:
   ```bash
   cp .env.example .env
   ```
3. **Levanta PostgreSQL**:
   ```bash
   docker compose up -d
   ```
4. **Aplica el esquema de base de datos** (crea las tablas):
   ```bash
   npx prisma migrate dev
   ```
5. **Carga datos de prueba** (usuarios demo + catálogo):
   ```bash
   npm run seed
   ```
6. **Inicia el servidor**:
   ```bash
   npm start
   ```
7. Verás en la terminal:
   ```
   Aguas corriendo en http://localhost:3000
   ```
8. **Abre esa dirección en tu navegador**: [http://localhost:3000](http://localhost:3000)

Para detener el servidor, presiona `Ctrl + C`. Para detener Postgres: `docker compose down`
(los datos persisten en un volumen Docker; `docker compose down -v` los borra).

### Usuarios de prueba (creados por `npm run seed`)

| Rol         | Correo                        | Contraseña      |
|-------------|-------------------------------|-----------------|
| Administrador | admin@aguaelgallo.com        | admin123        |
| Repartidor    | repartidor@aguaelgallo.com   | repartidor123   |
| Cliente       | cliente@aguaelgallo.com      | cliente123      |

### Cambiar el puerto

```bash
PORT=4000 npm start
```

## Estructura del proyecto

```
Aguas/
├── docker-compose.yml     # PostgreSQL para desarrollo
├── .env.example
├── package.json
├── server.js              # Express: sesión, rutas de vistas protegidas por rol, monta la API
├── prisma/
│   ├── schema.prisma      # Modelo de datos (usuarios, productos, pedidos, calidad, inventario)
│   ├── seed.js            # Usuarios y catálogo de prueba
│   └── migrations/
├── src/
│   ├── db.js              # Cliente Prisma
│   ├── middleware/auth.js # requireAuth / requireRole
│   └── routes/            # auth, productos, pedidos, despacho, calidad, inventario
├── views/                  # 8 vistas .html (una por pantalla) — fuera de public/ a propósito
└── public/
    ├── css/                # un .css por vista, extraído de su <style>
    └── js/                 # JS de cliente: fetch a la API, wiring de cada vista
```

Las vistas viven en `./views` (no en `public/views`) para que nunca puedan servirse como
archivo estático crudo: la única forma de llegar a un `.html` es a través de una ruta en
`server.js` que pasa primero por `requireRole`. Tampoco hay un `index.html` con enlaces a
todas las vistas — `/` redirige según el rol de la sesión activa, o a `/login` si no hay
sesión.

Cada vista usa Tailwind vía CDN y Google Fonts — se necesita conexión a internet para
que se vean los estilos correctamente aunque el servidor corra en local.

## Rutas de vistas (protegidas por rol vía sesión)

| Ruta                    | Vista                             | Rol requerido |
|--------------------------|------------------------------------|---------------|
| `/login`                  | 01-login.html                     | público       |
| `/productos`              | 02-cliente-productos.html         | CLIENTE       |
| `/despacho-repartidor`    | 03-despacho-repartidor.html       | REPARTIDOR    |
| `/admin/resumen`          | 04-admin-resumen.html             | ADMIN         |
| `/admin/pedidos`          | 05-admin-pedidos.html             | ADMIN         |
| `/admin/despacho`         | 06-admin-despacho.html            | ADMIN         |
| `/admin/calidad`          | 07-admin-calidad.html             | ADMIN         |
| `/admin/inventario`       | 08-admin-inventario.html          | ADMIN         |

Entrar a una ruta sin sesión redirige a `/login`. Entrar con el rol equivocado (ej. un
cliente pidiendo `/admin/inventario`) redirige a la vista que sí le corresponde a ese
rol, no muestra un error. `/` redirige automáticamente a la vista del rol de la sesión
activa; `/login` con sesión activa redirige igual, en vez de mostrar el formulario de
nuevo.

## API REST (bajo `/api`)

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/productos` (catálogo público), `POST/PUT/DELETE /api/productos/:id` (admin)
- `POST /api/pedidos` (cliente crea pedido), `GET /api/pedidos/mios` (cliente),
  `GET /api/pedidos` y `/resumen` (admin), `PATCH /api/pedidos/:id/estado`,
  `PATCH /api/pedidos/:id/asignar` (admin), `PATCH /api/pedidos/:id/entregar` (repartidor)
- `GET /api/despacho/mis-pedidos` (repartidor), `GET /api/despacho/repartidores`,
  `GET /api/despacho/tablero` (admin)
- `GET/POST/DELETE /api/calidad` (admin)
- `GET /api/inventario`, `GET/POST /api/inventario/movimientos` (admin)

Todas las rutas de API (salvo login y catálogo público) exigen sesión con el rol correcto.

## Despliegue gratis (Render + Neon)

Para que el cliente/comité pueda ver el sistema por internet sin pagar hosting. Se usan
dos servicios porque el Postgres gratis de Render **expira a los 30 días**; el de Neon
es un plan gratis permanente (sin fecha de vencimiento — los únicos límites son cuotas
mensuales de uso, ver más abajo).

### Paso 1 — Subir el código a GitHub

1. [github.com](https://github.com) → **New repository** → nombre → **Private** →
   Create (sin agregar README ni .gitignore, el proyecto ya los trae).
2. Desde `Aguas/`:
   ```bash
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   git branch -M master
   git push -u origin master
   ```
   Si pide contraseña: GitHub ya no acepta la contraseña de la cuenta por HTTPS. Genera
   un token en **Settings → Developer settings → Personal access tokens** (permiso
   `repo`) y úsalo como contraseña.

### Paso 2 — Base de datos en Neon

1. [neon.tech](https://neon.tech) → **Sign up** (con GitHub o email, sin tarjeta).
2. **Create a project** → nombre → región más cercana (ej. `sa-east-1` para
   Sudamérica) → Create.
3. En el dashboard del proyecto → **Connect** → copia el **Connection string**. Usa el
   host **sin** el sufijo `-pooler` (el directo, no el "pooled") — el "pooled" da
   problemas al correr `prisma migrate`. Ese valor completo es tu `DATABASE_URL`.

### Paso 3 — Servicio web en Render

1. [render.com](https://render.com) → **Sign up** (con GitHub, sin tarjeta).
2. **New +** → **Web Service** → conectar el repositorio (Render pide instalar su
   GitHub App y elegir el repo — un clic).
3. Completar el formulario:
   - **Branch**: `master`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
4. Antes de crear, en **Environment Variables** agrega:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | el connection string de Neon (paso 2) |
   | `SESSION_SECRET` | un texto largo aleatorio, ej. `openssl rand -hex 32` |
   | `DB_SSL` | `true` |

5. **Create Web Service**. Clona el repo, instala, aplica las migraciones y arranca
   (2-5 min la primera vez). La URL queda arriba del dashboard:
   `https://<nombre>.onrender.com`.

   Alternativa más rápida: **New +** → **Blueprint** en vez de **Web Service** — Render
   lee el `render.yaml` de este repo y llena Build/Start Command solo; igual pide
   `DATABASE_URL` a mano y genera `SESSION_SECRET` por su cuenta.

### Paso 4 — Cargar los datos de prueba (una sola vez, desde tu máquina)

```bash
DATABASE_URL="<el connection string de Neon>" npm run seed
```

### Paso 5 — Verificar

Abrir la URL de Render, entrar con `admin@aguaelgallo.com` / `admin123`.

### Cuánto dura / cuotas gratis

Ninguno de los dos expira por calendario — son planes gratis permanentes, no pruebas
por tiempo limitado:

- **Render**: 750 horas de instancia gratis al mes (se resetea cada mes). Se duerme a
  los 15 min sin visitas y tarda ~30-60 seg en despertar en la primera visita. **Abre
  el link 2-3 minutos antes de presentar** para que ya esté despierto.
- **Neon**: 0.5GB de almacenamiento y 100 horas de cómputo al mes por proyecto (se
  resetea cada mes). El cómputo se pausa a los 5 min sin uso, pero los datos nunca se
  borran.

Para un uso de demo/tesis (poco tráfico) ninguna de las dos cuotas es un problema real.

### Actualizaciones futuras

Cada `git push` a la rama conectada redespliega solo (auto-deploy viene activado por
defecto). Si cambias `prisma/schema.prisma`, el `buildCommand` ya aplica la migración
nueva en cada deploy — no hay que hacer nada manual en Render ni en Neon.

## Decisiones y límites conocidos

- **Autenticación**: sesión de servidor (`express-session` + `connect-pg-simple`,
  guardada en la tabla `session` de Postgres) con contraseñas hasheadas con `bcrypt`.
  No hay registro público de clientes: los usuarios se crean por seed o directamente en
  base de datos, porque el diseño original no incluye una vista de registro.
- **Edición de productos/stock en el panel de Inventario** usa `prompt()`/`confirm()`
  del navegador en lugar de un modal, porque el mockup original no diseñó uno. Es
  completamente funcional (escribe a la base de datos real), pero visualmente es la
  parte menos pulida — si se quiere mejorar la UX, ahí es el lugar.
- **Widgets de sensores en "Control de Calidad"** (medidor de TDS, gráfico de pH,
  turbidez, conductividad) son decorativos del diseño original: no hay integración con
  sensores reales (fuera de alcance). Lo que sí es real y funcional es la tabla de
  "Historial Reciente" con su formulario de alta, que lee y escribe en
  `registros_calidad`.
- **"Nuevo Pedido" desde el panel admin** está deshabilitado a propósito: los pedidos se
  crean desde el catálogo del cliente (que sí valida stock y calcula el total); crear un
  pedido a nombre de otro usuario desde el admin requeriría una pantalla de selección de
  cliente que no existe en el diseño.
- **Prisma**: se fijó la versión 6.19.3 (última mayor estable) tanto para `prisma` como
  `@prisma/client`. La versión 8 (release candidate al momento de escribir esto) cambia
  el formato de configuración (`datasource.url` ya no es válido en el schema); si en el
  futuro se quiere migrar, revisar la guía oficial de migración de mayor versión.

## Solución de problemas

- **`Error: listen EADDRINUSE`**: el puerto ya está en uso. Usa `PORT=4000 npm start`.
- **No conecta a la base de datos**: verifica que `docker compose ps` muestre `aguas-db`
  como `healthy` y que `DATABASE_URL` en `.env` apunte al puerto correcto.
- **Los estilos no cargan bien**: revisa tu conexión a internet (Tailwind y las fuentes
  se cargan desde un CDN externo).
- **Cambié el `schema.prisma`**: corre `npx prisma migrate dev --name <descripcion>` para
  generar y aplicar una nueva migración.
