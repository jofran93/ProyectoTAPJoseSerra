// Vista del repartidor: sus entregas asignadas y marcarlas como completadas.

let entregadasEnSesion = 0;

function tarjetaEntrega(p) {
  const itemsTexto = p.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', ');
  const contacto = p.cliente.telefono
    ? `<p class="text-on-surface-variant">${p.cliente.telefono}</p>`
    : '<p class="text-on-surface-variant text-sm">Sin teléfono registrado</p>';

  return `
    <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 shadow-ambient flex flex-col md:flex-row justify-between gap-4" data-pedido="${p.id}">
      <div class="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div><p class="text-xs font-label-md text-label-md text-outline uppercase tracking-wider">Comprador</p><p class="font-headline-md text-headline-md text-on-background text-lg">${p.cliente.nombre} ${p.cliente.apellido}</p></div>
        <div><p class="text-xs font-label-md text-label-md text-outline uppercase tracking-wider">Dirección</p><p class="text-on-surface-variant">${p.direccionEntrega}</p></div>
        <div><p class="text-xs font-label-md text-label-md text-outline uppercase tracking-wider">Contacto</p>${contacto}</div>
        <div><p class="text-xs font-label-md text-label-md text-outline uppercase tracking-wider">Pedido #${p.numero}</p><p class="font-bold text-primary">${itemsTexto}</p></div>
        <div><p class="text-xs font-label-md text-label-md text-outline uppercase tracking-wider">Pago</p><p class="text-on-surface-variant">Total: <span class="text-primary font-bold">${formatCLP(p.total)}</span></p><p class="text-on-surface-variant text-sm">Método: ${p.metodoPago}</p></div>
      </div>
      <div class="flex items-center gap-3">
        <button data-id="${p.id}" class="btn-completar bg-primary text-white px-6 rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors text-lg py-3">Completar Entrega</button>
        ${p.cliente.telefono ? `<a href="tel:${p.cliente.telefono}" class="p-2 border border-primary text-primary rounded-lg hover:bg-primary-fixed/50 transition-colors"><span class="material-symbols-outlined">call</span></a>` : ''}
      </div>
    </div>`;
}

async function cargarEntregas() {
  const cont = document.getElementById('lista-entregas');
  const pedidos = await apiFetch('/api/despacho/mis-pedidos');

  if (!pedidos.length) {
    cont.innerHTML = '<p class="text-on-surface-variant">No tienes entregas asignadas por el momento.</p>';
  } else {
    cont.innerHTML = pedidos.map(tarjetaEntrega).join('');
    cont.querySelectorAll('.btn-completar').forEach((btn) => {
      btn.addEventListener('click', () => completarEntrega(Number(btn.dataset.id)));
    });
  }

  document.getElementById('contador-completadas').textContent =
    `${entregadasEnSesion}/${pedidos.length + entregadasEnSesion} Completadas`;
}

async function completarEntrega(pedidoId) {
  const tarjeta = document.querySelector(`[data-pedido="${pedidoId}"]`);
  const boton = tarjeta.querySelector('.btn-completar');
  boton.disabled = true;
  boton.textContent = 'Marcando...';

  try {
    await apiFetch(`/api/pedidos/${pedidoId}/entregar`, { method: 'PATCH' });
    entregadasEnSesion += 1;
    await cargarEntregas();
  } catch (err) {
    alert(err.message || 'No se pudo marcar la entrega');
    boton.disabled = false;
    boton.textContent = 'Completar Entrega';
  }
}

document.addEventListener('DOMContentLoaded', cargarEntregas);
