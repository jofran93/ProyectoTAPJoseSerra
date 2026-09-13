const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const ESTADOS = ['PENDIENTE', 'PREPARANDO', 'LISTO', 'EN_RUTA', 'ENTREGADO', 'CANCELADO'];

function serializePedido(pedido) {
  return {
    id: pedido.id,
    numero: pedido.numero,
    estado: pedido.estado,
    direccionEntrega: pedido.direccionEntrega,
    metodoPago: pedido.metodoPago,
    total: pedido.total,
    creadoEn: pedido.creadoEn,
    entregadoEn: pedido.entregadoEn,
    cliente: pedido.cliente && {
      id: pedido.cliente.id,
      nombre: pedido.cliente.nombre,
      apellido: pedido.cliente.apellido,
    },
    repartidor: pedido.repartidor && {
      id: pedido.repartidor.id,
      nombre: pedido.repartidor.nombre,
      apellido: pedido.repartidor.apellido,
    },
    items: pedido.items && pedido.items.map((it) => ({
      productoId: it.productoId,
      nombre: it.producto ? it.producto.nombre : undefined,
      cantidad: it.cantidad,
      precioUnitario: it.precioUnitario,
    })),
  };
}

const incluirRelaciones = {
  cliente: true,
  repartidor: true,
  items: { include: { producto: true } },
};

// Cliente: crear un pedido a partir del carrito.
router.post('/', requireRole('CLIENTE'), async (req, res) => {
  const { items, direccionEntrega, metodoPago } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El pedido debe tener al menos un producto' });
  }
  if (!direccionEntrega || !direccionEntrega.trim()) {
    return res.status(400).json({ error: 'La dirección de entrega es obligatoria' });
  }
  if (!['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'].includes(metodoPago)) {
    return res.status(400).json({ error: 'Método de pago inválido' });
  }

  try {
    const pedido = await prisma.$transaction(async (tx) => {
      let total = 0;
      const itemsData = [];

      for (const it of items) {
        const cantidad = Number(it.cantidad);
        if (!Number.isInteger(cantidad) || cantidad <= 0) {
          throw new Error(`Cantidad inválida para el producto ${it.productoId}`);
        }
        const producto = await tx.producto.findUnique({ where: { id: Number(it.productoId) } });
        if (!producto || !producto.activo) {
          throw new Error(`Producto ${it.productoId} no disponible`);
        }
        if (producto.stock < cantidad) {
          throw new Error(`Stock insuficiente para "${producto.nombre}" (quedan ${producto.stock})`);
        }
        total += producto.precio * cantidad;
        itemsData.push({ productoId: producto.id, cantidad, precioUnitario: producto.precio });

        await tx.producto.update({
          where: { id: producto.id },
          data: { stock: { decrement: cantidad } },
        });
      }

      return tx.pedido.create({
        data: {
          clienteId: req.session.usuario.id,
          direccionEntrega: direccionEntrega.trim(),
          metodoPago,
          total,
          items: { create: itemsData },
        },
        include: incluirRelaciones,
      });
    });

    res.status(201).json(serializePedido(pedido));
  } catch (err) {
    res.status(400).json({ error: err.message || 'No se pudo crear el pedido' });
  }
});

// Cliente: ver sus propios pedidos.
router.get('/mios', requireRole('CLIENTE'), async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where: { clienteId: req.session.usuario.id },
    include: incluirRelaciones,
    orderBy: { creadoEn: 'desc' },
  });
  res.json(pedidos.map(serializePedido));
});

// Admin: métricas para el dashboard de resumen.
router.get('/resumen', requireRole('ADMIN'), async (req, res) => {
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const [porEstado, pedidosHoy, ventasHoyAgg, totalClientes, totalProductosBajoStock] = await Promise.all([
    prisma.pedido.groupBy({ by: ['estado'], _count: { _all: true } }),
    prisma.pedido.count({ where: { creadoEn: { gte: inicioHoy } } }),
    prisma.pedido.aggregate({
      _sum: { total: true },
      where: { creadoEn: { gte: inicioHoy }, estado: { not: 'CANCELADO' } },
    }),
    prisma.usuario.count({ where: { rol: 'CLIENTE', activo: true } }),
    prisma.producto.count({ where: { activo: true, stock: { lt: 10 } } }),
  ]);

  const conteoPorEstado = Object.fromEntries(ESTADOS.map((e) => [e, 0]));
  for (const fila of porEstado) conteoPorEstado[fila.estado] = fila._count._all;

  res.json({
    pedidosHoy,
    ventasHoy: ventasHoyAgg._sum.total || 0,
    totalClientes,
    productosBajoStock: totalProductosBajoStock,
    porEstado: conteoPorEstado,
  });
});

// Admin: listar todos los pedidos (con filtro opcional por estado).
router.get('/', requireRole('ADMIN'), async (req, res) => {
  const { estado } = req.query;
  const where = estado && ESTADOS.includes(estado) ? { estado } : {};
  const pedidos = await prisma.pedido.findMany({
    where,
    include: incluirRelaciones,
    orderBy: { creadoEn: 'desc' },
  });
  res.json(pedidos.map(serializePedido));
});

router.get('/:id', requireAuth, async (req, res) => {
  const pedido = await prisma.pedido.findUnique({
    where: { id: Number(req.params.id) },
    include: incluirRelaciones,
  });
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

  const { usuario } = req.session;
  const puedeVer =
    usuario.rol === 'ADMIN' ||
    (usuario.rol === 'CLIENTE' && pedido.clienteId === usuario.id) ||
    (usuario.rol === 'REPARTIDOR' && pedido.repartidorId === usuario.id);
  if (!puedeVer) return res.status(403).json({ error: 'No tienes permiso para ver este pedido' });

  res.json(serializePedido(pedido));
});

// Admin: cambiar estado de un pedido.
router.patch('/:id/estado', requireRole('ADMIN'), async (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

  try {
    const pedido = await prisma.pedido.update({
      where: { id: Number(req.params.id) },
      data: { estado, entregadoEn: estado === 'ENTREGADO' ? new Date() : undefined },
      include: incluirRelaciones,
    });
    res.json(serializePedido(pedido));
  } catch (err) {
    res.status(404).json({ error: 'Pedido no encontrado' });
  }
});

// Admin: asignar repartidor a un pedido (despacho).
router.patch('/:id/asignar', requireRole('ADMIN'), async (req, res) => {
  const { repartidorId } = req.body;
  const repartidor = await prisma.usuario.findFirst({
    where: { id: Number(repartidorId), rol: 'REPARTIDOR', activo: true },
  });
  if (!repartidor) return res.status(400).json({ error: 'Repartidor inválido' });

  try {
    const pedido = await prisma.pedido.update({
      where: { id: Number(req.params.id) },
      data: {
        repartidorId: repartidor.id,
        estado: 'EN_RUTA',
      },
      include: incluirRelaciones,
    });
    res.json(serializePedido(pedido));
  } catch (err) {
    res.status(404).json({ error: 'Pedido no encontrado' });
  }
});

// Repartidor: marcar como entregado uno de sus pedidos asignados.
router.patch('/:id/entregar', requireRole('REPARTIDOR'), async (req, res) => {
  const pedido = await prisma.pedido.findUnique({ where: { id: Number(req.params.id) } });
  if (!pedido || pedido.repartidorId !== req.session.usuario.id) {
    return res.status(403).json({ error: 'Este pedido no está asignado a ti' });
  }

  const actualizado = await prisma.pedido.update({
    where: { id: pedido.id },
    data: { estado: 'ENTREGADO', entregadoEn: new Date() },
    include: incluirRelaciones,
  });
  res.json(serializePedido(actualizado));
});

module.exports = router;
