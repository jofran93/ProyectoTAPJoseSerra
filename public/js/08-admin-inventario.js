// Inventario (admin): catálogo con stock real, edición completa (con imagen) y
// movimientos de stock.
//
// Las imágenes se guardan como texto base64 dentro del propio producto (columna
// imagenUrl) en vez de como archivo en disco: el plan gratis de Render borra el
// disco en cada redeploy, así que un archivo subido "a mano" desaparecería. La base
// de datos (Neon) sí es persistente. Por eso se redimensiona la imagen en el propio
// navegador antes de mandarla (ver redimensionarImagen), para no guardar fotos
// gigantes de celular tal cual.

let productosCache = [];
let editandoId = null;
let imagenSeleccionada = null; // data URL (base64) de la imagen elegida en el modal, o null si no se tocó

function placeholderImagen() {
  return `<div class="w-full h-full flex items-center justify-center bg-surface-variant/20"><span class="material-symbols-outlined text-outline text-5xl">water_drop</span></div>`;
}

function tarjetaProducto(p) {
  const bajoStock = p.stock < 10;
  const estadoClass = bajoStock ? 'status-error' : 'status-optimal';
  const estadoTexto = bajoStock ? 'Stock Bajo' : 'En Stock';
  const cardBorder = bajoStock ? 'border-error-container' : 'border-outline-variant/30';
  const imagenHtml = p.imagenUrl
    ? `<img alt="${p.nombre}" class="absolute inset-0 w-full h-full object-contain p-4" src="${p.imagenUrl}">`
    : placeholderImagen();

  return `
    <div class="bg-surface-container-lowest border ${cardBorder} rounded-xl overflow-hidden shadow-ambient flex flex-col sm:flex-row transition-transform hover:-translate-y-1 duration-300" data-id="${p.id}">
      <div class="w-full sm:w-48 h-48 sm:h-auto bg-surface-variant/20 flex-shrink-0 relative">
        ${imagenHtml}
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

  grid.querySelectorAll('.btn-editar').forEach((btn) => btn.addEventListener('click', () => abrirModalProducto(Number(btn.dataset.id))));
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

// Redimensiona la imagen elegida a como máximo 800px de lado y la re-comprime como
// JPEG antes de convertirla a base64, para no mandar/guardar fotos de celular tal
// cual (varios MB cada una).
function redimensionarImagen(file, maxLado = 800, calidad = 0.8) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer la imagen'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxLado) {
          height = Math.round((height * maxLado) / width);
          width = maxLado;
        } else if (height > maxLado) {
          width = Math.round((width * maxLado) / height);
          height = maxLado;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', calidad));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  });
}

function actualizarPreviewImagen(src) {
  const img = document.getElementById('campo-imagen-preview');
  const placeholder = document.getElementById('campo-imagen-placeholder');
  if (src) {
    img.src = src;
    img.hidden = false;
    placeholder.hidden = true;
  } else {
    img.hidden = true;
    placeholder.hidden = false;
  }
}

function abrirModalProducto(id) {
  editandoId = id || null;
  imagenSeleccionada = null;
  document.getElementById('form-producto').reset();
  document.getElementById('producto-error').hidden = true;
  document.getElementById('campo-imagen').value = '';

  const p = id ? productosCache.find((x) => x.id === id) : null;
  document.getElementById('modal-producto-titulo').textContent = p ? `Editar: ${p.nombre}` : 'Nuevo producto';
  document.getElementById('campo-nombre').value = p ? p.nombre : '';
  document.getElementById('campo-descripcion').value = p ? p.descripcion : '';
  document.getElementById('campo-precio').value = p ? p.precio : '';
  document.getElementById('campo-stock').value = p ? p.stock : '';
  actualizarPreviewImagen(p ? p.imagenUrl : null);

  document.getElementById('modal-producto').hidden = false;
}

function cerrarModalProducto() {
  document.getElementById('modal-producto').hidden = true;
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

document.addEventListener('DOMContentLoaded', () => {
  cargarInventario();
  document.getElementById('buscar-producto').addEventListener('input', renderGrid);
  document.getElementById('btn-nuevo-producto').addEventListener('click', () => abrirModalProducto(null));
  document.getElementById('btn-cancelar-producto').addEventListener('click', cerrarModalProducto);
  document.getElementById('btn-cerrar-modal-producto').addEventListener('click', cerrarModalProducto);

  document.getElementById('campo-imagen').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      imagenSeleccionada = await redimensionarImagen(file);
      actualizarPreviewImagen(imagenSeleccionada);
    } catch (err) {
      alert(err.message || 'No se pudo procesar la imagen');
      e.target.value = '';
    }
  });

  document.getElementById('form-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('producto-error');
    errorEl.hidden = true;

    const precio = Number(document.getElementById('campo-precio').value);
    const stock = Number(document.getElementById('campo-stock').value);
    if (!Number.isFinite(precio) || precio < 0) {
      errorEl.textContent = 'Precio inválido';
      errorEl.hidden = false;
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      errorEl.textContent = 'Stock inválido';
      errorEl.hidden = false;
      return;
    }

    const cuerpo = {
      nombre: document.getElementById('campo-nombre').value.trim(),
      descripcion: document.getElementById('campo-descripcion').value.trim(),
      precio,
      stock,
    };
    // Solo se manda imagenUrl si se eligió una nueva -- si no, en edición se deja la
    // que ya tenía el producto (el backend solo toca los campos presentes en el body).
    if (imagenSeleccionada) cuerpo.imagenUrl = imagenSeleccionada;

    try {
      if (editandoId) {
        await apiFetch(`/api/productos/${editandoId}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
      } else {
        await apiFetch('/api/productos', { method: 'POST', body: JSON.stringify(cuerpo) });
      }
      cerrarModalProducto();
      await cargarInventario();
    } catch (err) {
      errorEl.textContent = err.message || 'No se pudo guardar el producto';
      errorEl.hidden = false;
    }
  });
});
