const express = require('express');
const prisma = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Repartidor: pedidos que tiene asignados y siguen en curso.
router.get('/mis-pedidos', requireRole('REPARTIDOR'), async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where: {
      repartidorId: req.session.usuario.id,
      estado: { in: ['EN_RUTA', 'LISTO'] },
    },
    include: { cliente: true, items: { include: { producto: true } } },
    orderBy: { creadoEn: 'asc' },
  });

  res.json(
    pedidos.map((p) => ({
      id: p.id,
      numero: p.numero,
      estado: p.estado,
      direccionEntrega: p.direccionEntrega,
      metodoPago: p.metodoPago,
      total: p.total,
      cliente: { nombre: p.cliente.nombre, apellido: p.cliente.apellido, telefono: p.cliente.telefono },
      items: p.items.map((it) => ({ nombre: it.producto.nombre, cantidad: it.cantidad })),
    }))
  );
});

// Admin: lista de repartidores disponibles para asignar despacho.
router.get('/repartidores', requireRole('ADMIN'), async (req, res) => {
  const repartidores = await prisma.usuario.findMany({
    where: { rol: 'REPARTIDOR', activo: true },
    select: { id: true, nombre: true, apellido: true },
  });
  res.json(repartidores);
});

// Admin: tablero de despacho (pedidos listos, en ruta y recién entregados).
router.get('/tablero', requireRole('ADMIN'), async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where: { estado: { in: ['LISTO', 'EN_RUTA', 'ENTREGADO'] } },
    include: { cliente: true, repartidor: true },
    orderBy: { creadoEn: 'desc' },
    take: 50,
  });

  res.json(
    pedidos.map((p) => ({
      id: p.id,
      numero: p.numero,
      estado: p.estado,
      direccionEntrega: p.direccionEntrega,
      total: p.total,
      cliente: { nombre: p.cliente.nombre, apellido: p.cliente.apellido },
      repartidor: p.repartidor && { id: p.repartidor.id, nombre: p.repartidor.nombre, apellido: p.repartidor.apellido },
    }))
  );
});

module.exports = router;
