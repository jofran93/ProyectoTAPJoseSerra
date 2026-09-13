const express = require('express');
const prisma = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

function serializar(r) {
  return {
    id: r.id,
    fecha: r.fecha,
    lote: r.lote,
    operador: r.operador,
    ph: r.ph,
    turbiedad: r.turbiedad,
    conductividad: r.conductividad,
    tds: r.tds,
    responsable: `${r.responsable.nombre} ${r.responsable.apellido}`,
  };
}

function datosValidos(body) {
  const { fecha, lote, operador, ph, turbiedad, conductividad, tds } = body;
  if (!fecha || !lote || !operador) return null;
  const numeros = { ph: Number(ph), turbiedad: Number(turbiedad), conductividad: Number(conductividad), tds: Number(tds) };
  if (Object.values(numeros).some((n) => !Number.isFinite(n))) return null;
  return {
    fecha: new Date(fecha),
    lote: String(lote).trim(),
    operador: String(operador).trim(),
    ...numeros,
  };
}

router.get('/', requireRole('ADMIN'), async (req, res) => {
  const registros = await prisma.registroCalidad.findMany({
    include: { responsable: true },
    orderBy: { fecha: 'desc' },
    take: 100,
  });
  res.json(registros.map(serializar));
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const datos = datosValidos(req.body);
  if (!datos) {
    return res.status(400).json({ error: 'fecha, lote, operador, pH, turbiedad, conductividad y TDS son obligatorios' });
  }

  const registro = await prisma.registroCalidad.create({
    data: { ...datos, responsableId: req.session.usuario.id },
    include: { responsable: true },
  });
  res.status(201).json(serializar(registro));
});

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const datos = datosValidos(req.body);
  if (!datos) {
    return res.status(400).json({ error: 'fecha, lote, operador, pH, turbiedad, conductividad y TDS son obligatorios' });
  }

  try {
    const registro = await prisma.registroCalidad.update({
      where: { id: Number(req.params.id) },
      data: { ...datos, responsableId: req.session.usuario.id },
      include: { responsable: true },
    });
    res.json(serializar(registro));
  } catch (err) {
    res.status(404).json({ error: 'Registro no encontrado' });
  }
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.registroCalidad.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: 'Registro no encontrado' });
  }
});

module.exports = router;
