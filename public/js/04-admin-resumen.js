// Dashboard de administración: resumen + pedidos recientes.

function filaPedido(p) {
  const cantidad = p.items.reduce((acc, it) => acc + it.cantidad, 0);
  const badge = ESTADO_BADGE_CLASS[p.estado] || 'bg-surface-container-high text-on-surface-variant';
  return `
    <tr class="hover:bg-surface-bright transition-colors">
      <td class="p-4 text-on-surface-variant font-code text-code">#${p.numero}</td>
      <td class="p-4 font-medium text-on-background">${p.cliente.nombre} ${p.cliente.apellido}</td>
      <td class="p-4 text-on-surface-variant">${cantidad} producto(s)</td>
      <td class="p-4"><span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${badge}">${ESTADO_LABEL[p.estado]}</span></td>
    </tr>`;
}

async function cargarResumen() {
  const [resumen, usuario, pedidos] = await Promise.all([
    apiFetch('/api/pedidos/resumen'),
    apiFetch('/api/auth/me'),
    apiFetch('/api/pedidos'),
  ]);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('saludo-texto').textContent =
    usuario.usuario ? `${saludo}, ${usuario.usuario.nombre}` : saludo;

  document.getElementById('stat-pedidos-hoy').textContent = resumen.pedidosHoy;
  document.getElementById('stat-pedidos-hoy-2').textContent = resumen.pedidosHoy;

  const porDespachar =
    (resumen.porEstado.PENDIENTE || 0) + (resumen.porEstado.PREPARANDO || 0) + (resumen.porEstado.LISTO || 0);
  document.getElementById('stat-por-despachar').textContent = porDespachar;

  const entregados = resumen.porEstado.ENTREGADO || 0;
  document.getElementById('stat-entregados-hoy').textContent = entregados;
  const totalPedidos = Object.values(resumen.porEstado).reduce((a, b) => a + b, 0) || 1;
  document.getElementById('stat-entregados-bar').style.width = `${Math.round((entregados / totalPedidos) * 100)}%`;

  document.getElementById('stat-stock-bajo').textContent = resumen.productosBajoStock;

  const tbody = document.getElementById('tabla-pedidos-recientes');
  const recientes = pedidos.slice(0, 5);
  tbody.innerHTML = recientes.length
    ? recientes.map(filaPedido).join('')
    : '<tr><td class="p-4 text-on-surface-variant" colspan="4">Aún no hay pedidos.</td></tr>';
}

document.addEventListener('DOMContentLoaded', () => {
  cargarResumen();
  document.getElementById('btn-ver-todos').addEventListener('click', () => {
    window.location.href = '/admin/pedidos';
  });
});
