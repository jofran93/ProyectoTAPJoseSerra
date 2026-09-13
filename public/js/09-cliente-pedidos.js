// Mis Pedidos (cliente): estado y seguimiento de los pedidos propios.

const PASOS = [
  { estado: 'PENDIENTE', label: 'Confirmado', icon: 'receipt_long' },
  { estado: 'PREPARANDO', label: 'Preparando', icon: 'inventory_2' },
  { estado: 'LISTO', label: 'Listo', icon: 'task_alt' },
  { estado: 'EN_RUTA', label: 'En camino', icon: 'local_shipping' },
  { estado: 'ENTREGADO', label: 'Entregado', icon: 'home' },
];

function claseCirculo(estadoPaso, indiceActual, indicePaso) {
  if (indicePaso < indiceActual) return 'bg-tertiary-container text-on-tertiary-container';
  if (indicePaso === indiceActual) return 'bg-primary text-on-primary';
  return 'bg-surface-container-high text-outline';
}

function stepperHtml(estadoActual) {
  const indiceActual = PASOS.findIndex((p) => p.estado === estadoActual);

  return `
    <div class="flex items-center overflow-x-auto pb-2">
      ${PASOS.map((paso, i) => {
        const circulo = claseCirculo(paso.estado, indiceActual, i);
        const lineaCompleta = i < indiceActual ? 'bg-tertiary-container' : 'bg-surface-container-high';
        const textoClase = i <= indiceActual ? 'text-on-background font-medium' : 'text-outline';
        return `
          <div class="flex items-center ${i < PASOS.length - 1 ? 'flex-1' : ''} min-w-[64px]">
            <div class="flex flex-col items-center gap-1.5 shrink-0">
              <div class="w-9 h-9 rounded-full flex items-center justify-center ${circulo}">
                <span class="material-symbols-outlined text-[18px]">${paso.icon}</span>
              </div>
              <span class="text-[11px] text-center ${textoClase} w-16">${paso.label}</span>
            </div>
            ${i < PASOS.length - 1 ? `<div class="h-1 flex-1 mx-1 rounded-full ${lineaCompleta}"></div>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

function bannerCancelado() {
  return `
    <div class="flex items-center gap-3 bg-error-container/40 border border-error/20 rounded-lg p-4">
      <span class="material-symbols-outlined text-error">cancel</span>
      <p class="text-sm text-on-background">Este pedido fue cancelado.</p>
    </div>`;
}

function tarjetaPedido(p) {
  const itemsTexto = p.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', ');
  const badge = ESTADO_BADGE_CLASS[p.estado] || 'bg-surface-variant text-on-surface-variant';

  return `
    <div class="bg-surface-container-lowest rounded-xl shadow-ambient border border-surface-variant p-6">
      <div class="flex flex-wrap justify-between items-start gap-2 mb-6">
        <div>
          <h4 class="font-headline-md text-headline-md text-on-background">Pedido #${p.numero}</h4>
          <p class="text-sm text-on-surface-variant">${formatFecha(p.creadoEn)}</p>
        </div>
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badge}">${ESTADO_LABEL[p.estado]}</span>
      </div>

      ${p.estado === 'CANCELADO' ? bannerCancelado() : stepperHtml(p.estado)}

      <div class="mt-6 pt-4 border-t border-outline-variant/30 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div><p class="text-on-surface-variant mb-0.5">Productos</p><p class="text-on-background">${itemsTexto}</p></div>
        <div><p class="text-on-surface-variant mb-0.5">Dirección de entrega</p><p class="text-on-background">${p.direccionEntrega}</p></div>
        <div><p class="text-on-surface-variant mb-0.5">Método de pago</p><p class="text-on-background">${p.metodoPago}</p></div>
        <div><p class="text-on-surface-variant mb-0.5">Repartidor</p><p class="text-on-background">${p.repartidor ? `${p.repartidor.nombre} ${p.repartidor.apellido}` : 'Aún no asignado'}</p></div>
        ${p.entregadoEn ? `<div><p class="text-on-surface-variant mb-0.5">Entregado</p><p class="text-on-background">${formatFecha(p.entregadoEn)}</p></div>` : ''}
      </div>

      <div class="mt-4 flex justify-end">
        <span class="font-bold text-lg text-primary">Total: ${formatCLP(p.total)}</span>
      </div>
    </div>`;
}

async function cargarPedidos() {
  const cont = document.getElementById('pedidos-lista');
  const pedidos = await apiFetch('/api/pedidos/mios');

  cont.innerHTML = pedidos.length
    ? pedidos.map(tarjetaPedido).join('')
    : `
      <div class="bg-surface-container-lowest rounded-xl shadow-ambient border border-surface-variant p-10 text-center">
        <span class="material-symbols-outlined text-outline text-4xl mb-2">receipt_long</span>
        <p class="text-on-surface-variant">Todavía no tienes pedidos. <a href="/productos" class="text-primary font-medium hover:underline">Ir al catálogo</a></p>
      </div>`;
}

document.addEventListener('DOMContentLoaded', cargarPedidos);
