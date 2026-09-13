const { PrismaClient } = require('@prisma/client');

// Cliente único de Prisma para toda la app (evita agotar conexiones en dev con --watch).
const prisma = global.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
