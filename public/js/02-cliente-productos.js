// Catálogo de productos + carrito (sessionStorage) + creación de pedido.

const CARRITO_KEY = 'aguas_carrito';
let productosCache = [];

function cargarCarrito() {
  try {
    return JSON.parse(sessionStorage.getItem(CARRITO_KEY)) || [];
  } catch (_) {
    return [];
  }
}

function guardarCarrito(carrito) {
  sessionStorage.setItem(CARRITO_KEY, JSON.stringify(carrito));
}

function tarjetaProducto(p) {
  const etiqueta = p.etiqueta
    ? `<div class="absolute top-3 right-3 bg-tertiary-container text-on-tertiary-container text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">${p.etiqueta}</div>`
    : '';
  const sinStock = p.stock <= 0;

  return `
    <div class="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden shadow-ambient transition-all duration-300 product-card-hover flex flex-col">
      <div class="h-48 bg-surface-container-low relative overflow-hidden flex items-center justify-center p-4">
        <img alt="${p.nombre}" class="h-full w-auto object-contain" src="${p.imagenUrl || ''}">
        ${etiqueta}
      </div>
      <div class="p-5 flex-1 flex flex-col">
        <h4 class="font-headline-md text-headline-md text-on-background mb-1">${p.nombre}</h4>
        <p class="text-on-surface-variant text-sm mb-4 flex-1">${p.descripcion}</p>
        <p class="text-xs text-on-surface-variant mb-2">${sinStock ? 'Sin stock' : `Stock disponible: ${p.stock}`}</p>
        <div class="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/30">
          <span class="font-headline-md text-headline-md text-primary">${formatCLP(p.precio)}</span>
          <button data-id="${p.id}" ${sinStock ? 'disabled' : ''} class="btn-agregar bg-primary hover:bg-primary/90 text-on-primary px-4 py-2 rounded-lg font-label-md text-label-md transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
            <span class="material-symbols-outlined text-sm">add_shopping_cart</span>Agregar
          </button>
        </div>
      </div>
    </div>`;
}

function renderProductos() {
  const grid = document.getElementById('productos-grid');
  if (!productosCache.length) {
    grid.innerHTML = '<p class="text-on-surface-variant">No hay productos disponibles en este momento.</p>';
    return;
  }
  grid.innerHTML = productosCache.map(tarjetaProducto).join('');
  grid.querySelectorAll('.btn-agregar').forEach((btn) => {
    btn.addEventListener('click', () => agregarAlCarrito(Number(btn.dataset.id)));
  });
}

function agregarAlCarrito(productoId) {
  const producto = productosCache.find((p) => p.id === productoId);
  if (!producto) return;

  const carrito = cargarCarrito();
  const existente = carrito.find((it) => it.productoId === productoId);
  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({ productoId, nombre: producto.nombre, precio: producto.precio, cantidad: 1 });
  }
  guardarCarrito(carrito);
  renderCarrito();
}

function cambiarCantidad(productoId, delta) {
  let carrito = cargarCarrito();
  const item = carrito.find((it) => it.productoId === productoId);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) {
    carrito = carrito.filter((it) => it.productoId !== productoId);
  }
  guardarCarrito(carrito);
  renderCarrito();
}

function renderCarrito() {
  const carrito = cargarCarrito();
  const cont = document.getElementById('carrito-items');

  if (!carrito.length) {
    cont.innerHTML = '<p class="text-on-surface-variant text-sm">Tu carrito está vacío. Agrega productos del catálogo.</p>';
  } else {
    cont.innerHTML = carrito
      .map(
        (it) => `
      <div class="flex justify-between items-start">
        <div>
          <h4 class="font-label-md text-label-md text-on-background">${it.cantidad}x ${it.nombre}</h4>
          <p class="text-xs text-on-surface-variant">${formatCLP(it.precio)} c/u</p>
          <div class="flex items-center gap-2 mt-1">
            <button data-id="${it.productoId}" data-delta="-1" class="btn-cantidad w-6 h-6 rounded border border-outline-variant text-sm">-</button>
            <button data-id="${it.productoId}" data-delta="1" class="btn-cantidad w-6 h-6 rounded border border-outline-variant text-sm">+</button>
          </div>
        </div>
        <span class="font-body-md text-body-md font-bold text-on-background">${formatCLP(it.precio * it.cantidad)}</span>
      </div>`
      )
      .join('');
    cont.querySelectorAll('.btn-cantidad').forEach((btn) => {
      btn.addEventListener('click', () => cambiarCantidad(Number(btn.dataset.id), Number(btn.dataset.delta)));
    });
  }

  const total = carrito.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
  document.getElementById('carrito-subtotal').textContent = formatCLP(total);
  document.getElementById('carrito-total').textContent = formatCLP(total);
}

async function cargarProductos() {
  productosCache = await apiFetch('/api/productos');
  renderProductos();
}

function mostrarMensajePedido(texto, esError) {
  const el = document.getElementById('pedido-mensaje');
  el.textContent = texto;
  el.className = 'text-sm text-center ' + (esError ? 'text-error' : 'text-tertiary');
  el.hidden = false;
}

async function hacerPedido() {
  const carrito = cargarCarrito();
  const direccion = document.getElementById('address').value.trim();
  const metodoPago = document.querySelector('input[name="payment"]:checked');
  const boton = document.getElementById('btn-pedido');

  if (!carrito.length) return mostrarMensajePedido('Agrega al menos un producto al carrito.', true);
  if (!direccion) return mostrarMensajePedido('Ingresa una dirección de entrega.', true);
  if (!metodoPago) return mostrarMensajePedido('Selecciona un método de pago.', true);

  boton.disabled = true;
  try {
    await apiFetch('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify({
        items: carrito.map((it) => ({ productoId: it.productoId, cantidad: it.cantidad })),
        direccionEntrega: direccion,
        metodoPago: metodoPago.value,
      }),
    });
    sessionStorage.removeItem(CARRITO_KEY);
    renderCarrito();
    document.getElementById('address').value = '';
    metodoPago.checked = false;
    mostrarMensajePedido('¡Pedido realizado con éxito! Puedes ver su estado próximamente.', false);
    await cargarProductos(); // refresca stock mostrado
  } catch (err) {
    mostrarMensajePedido(err.message || 'No se pudo realizar el pedido', true);
  } finally {
    boton.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderCarrito();
  cargarProductos();
  document.getElementById('btn-pedido').addEventListener('click', hacerPedido);
});
