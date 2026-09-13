// Inventario (admin): catálogo con stock real, edición rápida y movimientos.
// Nota: la edición usa prompt()/confirm() del navegador -- el mockup no incluía
// un modal para esto; es la forma más simple de dejarlo realmente funcional.

let productosCache = [];

function tarjetaProducto(p) {
  const bajoStock = p.stock < 10;
  const estadoClass = bajoStock ? 'status-error' : 'status-optimal';
  const estadoTexto = bajoStock ? 'Stock Bajo' : 'En Stock';
  const cardBorder = bajoStock ? 'border-error-container' : 'border-outline-variant/30';

  return `
    <div class="bg-surface-container-lowest border ${cardBorder} rounded-xl overflow-hidden shadow-ambient flex flex-col sm:flex-row transition-transform hover:-translate-y-1 duration-300" data-id="${p.id}">
      <div class="w-full sm:w-48 h-48 sm:h-auto bg-surface-variant/20 flex-shrink-0 relative">
        <img alt="${p.nombre}" class="absolute inset-0 w-full h-full object-contain p-4" src="${p.imagenUrl || ''}">
        <div class="absolute top-2 left-2 ${estadoClass} font-label-md text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">${estadoTexto}</div>
        ${!p.activo ? '<div class="absolute top-2 right-2 bg-outline text-white font-label-md text-[10px] px-2 py-0.5 rounded-full uppercase">Inactivo</div>' : ''}
      </div>
      <div class="p-container-padding flex flex-col justify-between flex-1">
        <div>
          <div class="flex justify-between items-start"><div><h3 class="font-headline-md text-headline-md text-on-surface mb-2">${p.nombre}</h3><p class="text-on-surface-variant text-sm">${p.descripcion}</p></div><span class="font-headline-md text-headline-md text-primary">${formatCLP(p.precio)}</span></div>
          <div class="${bajoStock ? 'bg-error-container/20 border-error/20' : 'bg-surface border-outline-variant/20'} p-3 rounded-lg border flex justify-between items-center mb-stack-md mt-4"><span class="font-body-md text-body-md text-on-surface-variant">Stock Actual</span><span class="font-headline-md text-[20px] font-bold ${bajoStock ? 'text-error' : 'text-on-surface'}">${p.stock}</span></div>
        </div>
        <div class="flex gap-3 mt-4">
          <button data-id="${p.id}" class="btn-editar btn-secondary flex-1 py-2 font-label-md text-label-md">Editar Producto</button>
          <button data-id="${p.id}" class="btn-stock ${bajoStock ? 'btn-primary bg-error hover:shadow-[0_0_10px_rgba(186,26,26,0.5)] border-none' : 'btn-primary'} flex-1 py-2 font-label-md text-label-md">${bajoStock ? 'Reabastecer Ahora' : 'Actualizar Stock'}</button>
        </div>
      </div>
    </div>`;
}

function renderGrid() {
  const grid = document.getElementById('inventario-grid');
  const texto = document.getElementById('buscar-producto').value.trim().toLowerCase();
  const filtrados = productosCache.filter((p) => !texto || p.nombre.toLowerCase().includes(texto));

  grid.innerHTML = filtrados.length
    ? filtrados.map(tarjetaProducto).join('')
    : '<p class="text-on-surface-variant">No hay productos que coincidan.</p>';

  grid.querySelectorAll('.btn-editar').forEach((btn) => btn.addEventListener('click', () => editarProducto(Number(btn.dataset.id))));
  grid.querySelectorAll('.btn-stock').forEach((btn) => btn.addEventListener('click', () => actualizarStock(Number(btn.dataset.id))));
}

async function cargarInventario() {
  productosCache = await apiFetch('/api/inventario');
  renderGrid();

  const totalStock = productosCache.reduce((acc, p) => acc + p.stock, 0);
  const bajoStock = productosCache.filter((p) => p.stock < 10).length;
  document.getElementById('inv-total-stock').textContent = totalStock;
  document.getElementById('inv-bajo-stock').textContent = bajoStock;
  document.getElementById('inv-ultima-sync').textContent = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

async function editarProducto(id) {
  const p = productosCache.find((x) => x.id === id);
  if (!p) return;

  const nombre = prompt('Nombre del producto:', p.nombre);
  if (nombre === null) return;
  const descripcion = prompt('Descripción:', p.descripcion);
  if (descripcion === null) return;
  const precioStr = prompt('Precio (CLP):', p.precio);
  if (precioStr === null) return;
  const precio = Number(precioStr);
  if (!Number.isFinite(precio) || precio < 0) return alert('Precio inválido');

  try {
    await apiFetch(`/api/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nombre, descripcion, precio }),
    });
    await cargarInventario();
  } catch (err) {
    alert(err.message || 'No se pudo actualizar el producto');
  }
}

async function actualizarStock(id) {
  const p = productosCache.find((x) => x.id === id);
  if (!p) return;

  const cantidadStr = prompt(
    `Stock actual de "${p.nombre}": ${p.stock}\n¿Cuántas unidades deseas agregar? (usa un número negativo para descontar)`,
    '10'
  );
  if (cantidadStr === null) return;
  const cantidad = Number(cantidadStr);
  if (!Number.isInteger(cantidad) || cantidad === 0) return alert('Ingresa un número entero distinto de 0');

  try {
    await apiFetch('/api/inventario/movimientos', {
      method: 'POST',
      body: JSON.stringify({
        productoId: id,
        tipo: cantidad > 0 ? 'ENTRADA' : 'SALIDA',
        cantidad,
        motivo: 'Ajuste manual desde inventario',
      }),
    });
    await cargarInventario();
  } catch (err) {
    alert(err.message || 'No se pudo actualizar el stock');
  }
}

async function crearProducto() {
  const nombre = prompt('Nombre del nuevo producto:');
  if (!nombre) return;
  const descripcion = prompt('Descripción:', '') || '';
  const precioStr = prompt('Precio (CLP):', '0');
  const precio = Number(precioStr);
  if (!Number.isFinite(precio) || precio < 0) return alert('Precio inválido');
  const stockStr = prompt('Stock inicial:', '0');
  const stock = Number(stockStr);
  if (!Number.isInteger(stock) || stock < 0) return alert('Stock inválido');

  try {
    await apiFetch('/api/productos', {
      method: 'POST',
      body: JSON.stringify({ nombre, descripcion, precio, stock }),
    });
    await cargarInventario();
  } catch (err) {
    alert(err.message || 'No se pudo crear el producto');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarInventario();
  document.getElementById('buscar-producto').addEventListener('input', renderGrid);
  document.getElementById('btn-nuevo-producto').addEventListener('click', crearProducto);
});
