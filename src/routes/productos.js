const express = require('express');
const prisma = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Catálogo público (cliente): solo productos activos.
router.get('/', async (req, res) => {
  const soloActivos = req.query.todos !== '1';
  const productos = await prisma.producto.findMany({
    where: soloActivos ? { activo: true } : {},
    orderBy: { id: 'asc' },
  });
  res.json(productos);
});

router.get('/:id', async (req, res) => {
  const producto = await prisma.producto.findUnique({ where: { id: Number(req.params.id) } });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

// A partir de aquí, solo ADMIN (creación/edición de catálogo).
router.post('/', requireRole('ADMIN'), async (req, res) => {
  const { nombre, descripcion, precio, stock, imagenUrl, destacado, etiqueta } = req.body;
  if (!nombre || precio == null) {
    return res.status(400).json({ error: 'nombre y precio son obligatorios' });
  }
  const producto = await prisma.producto.create({
    data: {
      nombre,
      descripcion: descripcion || '',
      precio: Number(precio),
      stock: Number(stock) || 0,
      imagenUrl: imagenUrl || null,
      destacado: Boolean(destacado),
      etiqueta: etiqueta || null,
    },
  });
  res.status(201).json(producto);
});

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const { nombre, descripcion, precio, stock, imagenUrl, destacado, etiqueta, activo } = req.body;
  try {
    const producto = await prisma.producto.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(precio !== undefined && { precio: Number(precio) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(imagenUrl !== undefined && { imagenUrl }),
        ...(destacado !== undefined && { destacado: Boolean(destacado) }),
        ...(etiqueta !== undefined && { etiqueta }),
        ...(activo !== undefined && { activo: Boolean(activo) }),
      },
    });
    res.json(producto);
  } catch (err) {
    res.status(404).json({ error: 'Producto no encontrado' });
  }
});

// Baja lógica (no se borra físicamente para no romper pedidos históricos).
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.producto.update({ where: { id: Number(req.params.id) }, data: { activo: false } });
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: 'Producto no encontrado' });
  }
});

module.exports = router;
