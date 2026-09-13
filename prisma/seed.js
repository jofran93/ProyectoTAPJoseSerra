// Datos iniciales para poder probar el sistema apenas se levanta.
// Ejecutar con: npm run seed

const bcrypt = require('bcrypt');
const prisma = require('../src/db');

async function hash(password) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('Sembrando datos iniciales...');

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@aguaelgallo.com' },
    update: {},
    create: {
      email: 'admin@aguaelgallo.com',
      passwordHash: await hash('admin123'),
      nombre: 'Carla',
      apellido: 'Administradora',
      rol: 'ADMIN',
    },
  });

  const repartidor = await prisma.usuario.upsert({
    where: { email: 'repartidor@aguaelgallo.com' },
    update: {},
    create: {
      email: 'repartidor@aguaelgallo.com',
      passwordHash: await hash('repartidor123'),
      nombre: 'Pedro',
      apellido: 'Reparto',
      telefono: '+56911111111',
      rol: 'REPARTIDOR',
    },
  });

  const cliente = await prisma.usuario.upsert({
    where: { email: 'cliente@aguaelgallo.com' },
    update: {},
    create: {
      email: 'cliente@aguaelgallo.com',
      passwordHash: await hash('cliente123'),
      nombre: 'Sofía',
      apellido: 'Cliente',
      telefono: '+56922222222',
      direccion: 'Av. Siempre Viva 742, Santiago',
      rol: 'CLIENTE',
    },
  });

  const productosData = [
    {
      nombre: 'Bidón 20L',
      descripcion: 'Agua purificada de máxima calidad, ideal para el hogar o la oficina.',
      precio: 1500,
      stock: 120,
      destacado: true,
      etiqueta: 'Popular',
      imagenUrl:
        'https://lh3.googleusercontent.com/aida/AEtjO1VKWzVfSgr3b001BpDTsCyuWlLlQve2cUMz6g2B-BP8d2_wSHAa0VCgZkkAp3I0VfgTIPFl9XMgU32iXOWYP-MUSusIt61m7t2qYtnYVH7dq8ar9IdCCfEzvJrEW3ROSSpGiJbMPQ-_uGBPPBWWoLUsOam2i3yeROezzRmH9WWVe4a5rdRBaOM-EaHYYFLGLAehy8cn_knLvWCYf5lfLadlwQO14iINBzqP4BjWyD3FVZkKGXOTbRdD8rvx',
    },
    {
      nombre: 'Bidón 20L Mayorista',
      descripcion: 'Precio especial para pedidos de 10 unidades o más.',
      precio: 900,
      stock: 300,
      etiqueta: 'Mayorista',
      imagenUrl:
        'https://lh3.googleusercontent.com/aida/AEtjO1V_Z3J3eSgqiIKfEf1dm4iyooHosQCslgnobLyBYNCBN03pSWbE5l_UBE0BZwa2_9GCoTDcQM0UuVKpR3nec-Au2XT5Y8BlWt9h888zklyJfdMOqdkitZNf5f-cCjYWMZWc7TkOS40fb-B8xfhh2oUgPfCjMPtVr4zY3xy1T64PwtF4gE7r0668jcAAWXm7bLeO4jJIS1dqAwipoE2E3GVHYbIoA_MvB6YJ6hkyJ1vtehSaKc3cB-Opp7xv',
    },
    {
      nombre: 'Bolsa Hielo 2kg',
      descripcion: 'Hielo en cubos cristalinos, purificados y de larga duración.',
      precio: 1200,
      stock: 80,
      imagenUrl:
        'https://lh3.googleusercontent.com/aida/AEtjO1WVOIttUQ79cRwOXqHH-MYEzzMBfrBPgZjWmt9iSYAGHOUoNxYMDCQ1wHfq3T6DHmX0W79QXpWEcvZ5WHzi5ipIJtSY5djOQcVVYIaZhlV_jktzNJj57h_oqzfxXgq689B-V6BkYnyIZgAQWKlK6aAjSHLYhefRIqVmr5ZcEbpzEKoI1G2nUm18erwERmhxlyUPBBcpHrbwGUcCeqFk4e_lTvbZq3kLLvY44sf6C_PKx8A07vbzfjpJcQe_',
    },
    {
      nombre: 'Bolsa Hielo 1kg',
      descripcion: 'Formato práctico para consumo rápido. Hielo cristal.',
      precio: 800,
      stock: 100,
      imagenUrl:
        'https://lh3.googleusercontent.com/aida/AEtjO1Ui4-uYOo1jfIpeDOuidK4Op4dKrcpAtTcQINO-C8uv6nHtCAmJ5yNgpYgB_JgnUVzbFU3GfG8r3sQt-H2jzHFp20ts04YzV7mPoaXJKaPOAFiDDD9t1XROt88hetDTWxBPGcBj2KKXE-FpS0NfzjGGkFZmk6wz3uGLqun0YHJjxnw-JwJ0xzswCubKxC0J4WiRVDSHKPbhvgw-t3wtGIDJ0UZZKlx56oUlOaFJM4vLF19SE1C2aaaSs_ew',
    },
  ];

  const productos = [];
  for (const data of productosData) {
    const existente = await prisma.producto.findFirst({ where: { nombre: data.nombre } });
    const producto = existente
      ? await prisma.producto.update({ where: { id: existente.id }, data })
      : await prisma.producto.create({ data });
    productos.push(producto);
  }

  // Un pedido de ejemplo ya entregado, para que Resumen/Pedidos no arranquen vacíos.
  const pedidoExistente = await prisma.pedido.findFirst({ where: { clienteId: cliente.id } });
  if (!pedidoExistente) {
    const [bidon20, hielo2kg] = productos;
    await prisma.pedido.create({
      data: {
        clienteId: cliente.id,
        repartidorId: repartidor.id,
        estado: 'ENTREGADO',
        direccionEntrega: cliente.direccion,
        metodoPago: 'EFECTIVO',
        total: bidon20.precio * 2 + hielo2kg.precio,
        entregadoEn: new Date(),
        items: {
          create: [
            { productoId: bidon20.id, cantidad: 2, precioUnitario: bidon20.precio },
            { productoId: hielo2kg.id, cantidad: 1, precioUnitario: hielo2kg.precio },
          ],
        },
      },
    });
  }

  // Un registro de calidad de ejemplo.
  const registroExistente = await prisma.registroCalidad.findFirst();
  if (!registroExistente) {
    await prisma.registroCalidad.create({
      data: {
        fecha: new Date(),
        lote: 'L-0001A',
        operador: `${admin.nombre} ${admin.apellido}`,
        ph: 7.2,
        turbiedad: 0.18,
        conductividad: 36,
        tds: 18,
        responsableId: admin.id,
      },
    });
  }

  console.log('Listo. Usuarios de prueba:');
  console.log('  admin@aguaelgallo.com / admin123');
  console.log('  repartidor@aguaelgallo.com / repartidor123');
  console.log('  cliente@aguaelgallo.com / cliente123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
