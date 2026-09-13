const express = require('express');
const prisma = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Estado actual del inventario (todos los productos, activos o no).
router.get('/', requireRole('ADMIN'), async (req, res) => {
  const productos = await prisma.producto.findMany({ orderBy: { nombre: 'asc' } });
  res.json(productos);
});

router.get('/movimientos', requireRole('ADMIN'), async (req, res) => {
  const movimientos = await prisma.movimientoInventario.findMany({
    include: { producto: true, responsable: true },
    orderBy: { fecha: 'desc' },
    take: 100,
  });
  res.json(
    movimientos.map((m) => ({
      id: m.id,
      fecha: m.fecha,
      tipo: m.tipo,
      cantidad: m.cantidad,
      motivo: m.motivo,
      producto: m.producto.nombre,
      responsable: `${m.responsable.nombre} ${m.responsable.apellido}`,
    }))
  );
});

// Registra un movimiento de stock y actualiza el total del producto.
router.post('/movimientos', requireRole('ADMIN'), async (req, res) => {
  const { productoId, tipo, cantidad, motivo } = req.body;
  const cant = Number(cantidad);

  if (!['ENTRADA', 'SALIDA', 'AJUSTE'].includes(tipo) || !Number.isInteger(cant) || cant === 0) {
    return res.status(400).json({ error: 'tipo y cantidad (entero distinto de 0) son obligatorios' });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findUnique({ where: { id: Number(productoId) } });
      if (!producto) throw new Error('Producto no encontrado');

      const delta = tipo === 'SALIDA' ? -Math.abs(cant) : Math.abs(cant);
      const nuevoStock = producto.stock + delta;
      if (nuevoStock < 0) throw new Error(`Stock insuficiente (actual: ${producto.stock})`);

      const actualizado = await tx.producto.update({
        where: { id: producto.id },
        data: { stock: nuevoStock },
      });

      const movimiento = await tx.movimientoInventario.create({
        data: {
          productoId: producto.id,
          tipo,
          cantidad: Math.abs(cant),
          motivo: motivo || null,
          responsableId: req.session.usuario.id,
        },
      });

      return { producto: actualizado, movimiento };
    });

    res.status(201).json(resultado);
  } catch (err) {
    res.status(400).json({ error: err.message || 'No se pudo registrar el movimiento' });
  }
});

module.exports = router;
