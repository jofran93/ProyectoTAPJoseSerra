// Gestión de pedidos (admin): listar, filtrar por estado, buscar y cambiar estado.

const ESTADOS_LISTA = ['PENDIENTE', 'PREPARANDO', 'LISTO', 'EN_RUTA', 'ENTREGADO', 'CANCELADO'];
let pedidosCache = [];
let filtroActual = '';

function opcionesEstado(actual) {
  return ESTADOS_LISTA.map(
    (e) => `<option value="${e}" ${e === actual ? 'selected' : ''}>${ESTADO_LABEL[e]}</option>`
  ).join('');
}

function filaPedido(p) {
  const iniciales = (p.cliente.nombre[0] || '') + (p.cliente.apellido[0] || '');
  return `
    <tr class="hover:bg-surface-variant/10 transition-colors group" data-cliente="${(p.cliente.nombre + ' ' + p.cliente.apellido).toLowerCase()}">
      <td class="py-4 px-6 font-code text-code text-on-surface-variant">#${p.numero}</td>
      <td class="py-4 px-6"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-primary-container/20 text-primary flex items-center justify-center font-bold text-sm">${iniciales.toUpperCase()}</div><div><p class="font-medium text-on-background">${p.cliente.nombre} ${p.cliente.apellido}</p><p class="text-sm text-on-surface-variant">${p.direccionEntrega}</p></div></div></td>
      <td class="py-4 px-6 text-on-surface-variant">${formatFecha(p.creadoEn)}</td>
      <td class="py-4 px-6"><span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-md text-[12px] ${ESTADO_BADGE_CLASS[p.estado]}">${ESTADO_LABEL[p.estado]}</span></td>
      <td class="py-4 px-6 text-right font-medium">${formatCLP(p.total)}</td>
      <td class="py-4 px-6 text-center">
        <select data-id="${p.id}" class="select-estado border border-outline-variant rounded-md text-sm py-1 px-1 bg-surface-container-lowest">
          ${opcionesEstado(p.estado)}
        </select>
      </td>
    </tr>`;
}

function renderTabla() {
  const tbody = document.getElementById('tabla-pedidos');
  const texto = document.getElementById('buscar-pedido').value.trim().toLowerCase();
  const filtrados = pedidosCache.filter((p) =>
    !texto || (p.cliente.nombre + ' ' + p.cliente.apellido).toLowerCase().includes(texto) || String(p.numero).includes(texto)
  );

  tbody.innerHTML = filtrados.length
    ? filtrados.map(filaPedido).join('')
    : '<tr><td class="py-4 px-6 text-on-surface-variant" colspan="6">No hay pedidos que coincidan.</td></tr>';

  tbody.querySelectorAll('.select-estado').forEach((sel) => {
    sel.addEventListener('change', () => cambiarEstado(Number(sel.dataset.id), sel.value));
  });

  document.getElementById('contador-pedidos').textContent = `Mostrando ${filtrados.length} pedido(s)`;
}

async function cargarPedidos() {
  const qs = filtroActual ? `?estado=${filtroActual}` : '';
  pedidosCache = await apiFetch(`/api/pedidos${qs}`);
  renderTabla();
}

async function cambiarEstado(pedidoId, estado) {
  try {
    await apiFetch(`/api/pedidos/${pedidoId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    });
    await cargarPedidos();
  } catch (err) {
    alert(err.message || 'No se pudo actualizar el estado');
    cargarPedidos();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarPedidos();

  document.querySelectorAll('.filtro-estado').forEach((btn) => {
    btn.addEventListener('click', () => {
      filtroActual = btn.dataset.estado;
      document.querySelectorAll('.filtro-estado').forEach((b) => {
        b.classList.remove('bg-primary-container/10', 'text-primary', 'border-primary');
        b.classList.add('text-on-surface-variant', 'border-transparent');
      });
      btn.classList.add('bg-primary-container/10', 'text-primary', 'border-primary');
      btn.classList.remove('text-on-surface-variant', 'border-transparent');
      cargarPedidos();
    });
  });

  document.getElementById('buscar-pedido').addEventListener('input', renderTabla);
});
