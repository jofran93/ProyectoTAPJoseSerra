// Tablero de despacho (admin): asignar repartidor a pedidos listos, marcar entregados.

let repartidoresCache = [];

function opcionesRepartidor() {
  return (
    '<option value="">Elegir repartidor...</option>' +
    repartidoresCache.map((r) => `<option value="${r.id}">${r.nombre} ${r.apellido}</option>`).join('')
  );
}

function tarjetaDespacho(p) {
  const badge = ESTADO_BADGE_CLASS[p.estado] || '';
  const opacidad = p.estado === 'ENTREGADO' ? 'opacity-70' : '';

  let acciones;
  if (p.estado === 'LISTO') {
    acciones = `
      <select data-id="${p.id}" class="select-repartidor border border-outline-variant rounded-lg px-2 py-2 text-sm">
        ${opcionesRepartidor()}
      </select>
      <button data-id="${p.id}" class="btn-asignar bg-primary text-white px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors">Asignar y despachar</button>`;
  } else if (p.estado === 'EN_RUTA') {
    acciones = `<button data-id="${p.id}" class="btn-entregar bg-primary text-white px-6 py-2 rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors">Marcar entregado</button>`;
  } else {
    acciones = `<span class="text-on-surface-variant text-sm font-medium">Entrega completada</span>`;
  }

  return `
    <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 shadow-ambient ${opacidad} flex flex-col md:flex-row justify-between gap-4" data-pedido="${p.id}">
      <div class="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div><p class="text-xs font-label-md text-label-md text-outline uppercase tracking-wider">Comprador</p><p class="font-headline-md text-headline-md text-on-background text-lg">${p.cliente.nombre} ${p.cliente.apellido}</p></div>
        <div><p class="text-xs font-label-md text-label-md text-outline uppercase tracking-wider">Dirección</p><p class="text-on-surface-variant">${p.direccionEntrega}</p></div>
        <div><p class="text-xs font-label-md text-label-md text-outline uppercase tracking-wider">Pedido</p><p class="font-bold text-primary">#${p.numero} · ${formatCLP(p.total)}</p></div>
        <div><p class="text-xs font-label-md text-label-md text-outline uppercase tracking-wider">Estado</p><span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-md text-[12px] ${badge}">${ESTADO_LABEL[p.estado]}</span></div>
        <div><p class="text-xs font-label-md text-label-md text-outline uppercase tracking-wider">Repartidor</p><p class="text-on-surface-variant">${p.repartidor ? p.repartidor.nombre + ' ' + p.repartidor.apellido : 'Sin asignar'}</p></div>
      </div>
      <div class="flex items-center gap-3">${acciones}</div>
    </div>`;
}

async function cargarDespacho() {
  const [pedidos, repartidores] = await Promise.all([
    apiFetch('/api/despacho/tablero'),
    apiFetch('/api/despacho/repartidores'),
  ]);
  repartidoresCache = repartidores;

  const cont = document.getElementById('lista-despacho');
  cont.innerHTML = pedidos.length
    ? pedidos.map(tarjetaDespacho).join('')
    : '<p class="text-on-surface-variant">No hay pedidos listos, en ruta o entregados por ahora.</p>';

  cont.querySelectorAll('.btn-asignar').forEach((btn) => {
    btn.addEventListener('click', () => asignarRepartidor(Number(btn.dataset.id)));
  });
  cont.querySelectorAll('.btn-entregar').forEach((btn) => {
    btn.addEventListener('click', () => marcarEntregado(Number(btn.dataset.id)));
  });

  const completados = pedidos.filter((p) => p.estado === 'ENTREGADO').length;
  document.getElementById('contador-despacho').textContent = `${completados}/${pedidos.length} Completadas`;
}

async function asignarRepartidor(pedidoId) {
  const tarjeta = document.querySelector(`[data-pedido="${pedidoId}"]`);
  const select = tarjeta.querySelector('.select-repartidor');
  if (!select.value) return alert('Selecciona un repartidor primero');

  try {
    await apiFetch(`/api/pedidos/${pedidoId}/asignar`, {
      method: 'PATCH',
      body: JSON.stringify({ repartidorId: Number(select.value) }),
    });
    await cargarDespacho();
  } catch (err) {
    alert(err.message || 'No se pudo asignar el repartidor');
  }
}

async function marcarEntregado(pedidoId) {
  try {
    await apiFetch(`/api/pedidos/${pedidoId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'ENTREGADO' }),
    });
    await cargarDespacho();
  } catch (err) {
    alert(err.message || 'No se pudo marcar como entregado');
  }
}

document.addEventListener('DOMContentLoaded', cargarDespacho);
