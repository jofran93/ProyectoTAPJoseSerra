const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../db');
const DESTINO_POR_ROL = require('../rolDestinos');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!usuario || !usuario.activo) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const passwordOk = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  req.session.usuario = {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    rol: usuario.rol,
  };

  res.json({ usuario: req.session.usuario, redirectTo: DESTINO_POR_ROL[usuario.rol] || '/' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  res.json({ usuario: req.session.usuario || null });
});

module.exports = router;
