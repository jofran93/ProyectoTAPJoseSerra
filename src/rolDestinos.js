// Adónde mandar a cada rol cuando no hay una ruta más específica en juego
// (login exitoso, "/", o un intento de entrar a una vista que no le corresponde).
module.exports = {
  ADMIN: '/admin/resumen',
  CLIENTE: '/productos',
  REPARTIDOR: '/despacho-repartidor',
};
