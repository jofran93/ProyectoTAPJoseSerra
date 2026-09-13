// Control de calidad (admin): historial de análisis por lote + alta/edición desde
// el mismo formulario (sin modal: "Editar" precarga el formulario de arriba).

let registrosCache = [];
let editandoId = null;

function formatFechaCorta(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function iniciales(nombre) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function filaCalidad(r) {
  return `
    <tr class="hover:bg-surface/50 transition-colors" data-id="${r.id}">
      <td class="p-4 text-outline whitespace-nowrap">${formatFechaCorta(r.fecha)}</td>
      <td class="p-4 text-on-background font-bold whitespace-nowrap">${r.lote}</td>
      <td class="p-4 whitespace-nowrap">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-secondary-container/20 text-secondary-container flex items-center justify-center text-xs font-bold">${iniciales(r.operador)}</div>
          <span class="text-on-background">${r.operador}</span>
        </div>
      </td>
      <td class="p-4 text-center font-medium whitespace-nowrap"><span class="px-2 py-0.5 rounded bg-tertiary-container/10 text-tertiary font-semibold">${r.ph}</span></td>
      <td class="p-4 text-center whitespace-nowrap">${r.turbiedad} NTU</td>
      <td class="p-4 text-center whitespace-nowrap">${r.conductividad} µS/cm</td>
      <td class="p-4 text-center whitespace-nowrap">${r.tds} ppm</td>
      <td class="p-4 text-right whitespace-nowrap">
        <div class="flex items-center justify-end gap-1.5">
          <button data-id="${r.id}" class="btn-editar-calidad flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-container/10 rounded-md transition-colors cursor-pointer" title="Editar registro" type="button">
            <span class="material-symbols-outlined text-[16px]">edit</span> Editar
          </button>
          <button data-id="${r.id}" class="btn-borrar-calidad flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-error hover:bg-error-container/40 rounded-md transition-colors cursor-pointer" title="Eliminar registro" type="button">
            <span class="material-symbols-outlined text-[16px]">delete</span> Eliminar
          </button>
        </div>
      </td>
    </tr>`;
}

function renderTabla() {
  const tbody = document.getElementById('tabla-calidad');
  const texto = document.getElementById('buscar-calidad').value.trim().toLowerCase();
  const filtrados = registrosCache.filter(
    (r) => !texto || r.lote.toLowerCase().includes(texto) || r.operador.toLowerCase().includes(texto)
  );

  tbody.innerHTML = filtrados.length
    ? filtrados.map(filaCalidad).join('')
    : '<tr><td class="p-4 text-outline" colspan="8">No hay registros que coincidan.</td></tr>';

  tbody.querySelectorAll('.btn-editar-calidad').forEach((btn) => {
    btn.addEventListener('click', () => cargarEnFormulario(Number(btn.dataset.id)));
  });
  tbody.querySelectorAll('.btn-borrar-calidad').forEach((btn) => {
    btn.addEventListener('click', () => borrarRegistro(Number(btn.dataset.id)));
  });

  document.getElementById('contador-calidad').textContent =
    `${registrosCache.length} registro${registrosCache.length === 1 ? '' : 's'}`;
}

async function cargarCalidad() {
  registrosCache = await apiFetch('/api/calidad');
  renderTabla();
}

function fechaInputISO(fecha) {
  return new Date(fecha).toISOString().slice(0, 10);
}

function cargarEnFormulario(id) {
  const r = registrosCache.find((x) => x.id === id);
  if (!r) return;

  editandoId = id;
  document.getElementById('calidad-fecha').value = fechaInputISO(r.fecha);
  document.getElementById('calidad-lote').value = r.lote;
  document.getElementById('calidad-operador').value = r.operador;
  document.getElementById('calidad-ph').value = r.ph;
  document.getElementById('calidad-turbiedad').value = r.turbiedad;
  document.getElementById('calidad-conductividad').value = r.conductividad;
  document.getElementById('calidad-tds').value = r.tds;

  document.getElementById('form-calidad-titulo').textContent = `Editando registro de lote ${r.lote}`;
  document.getElementById('btn-guardar-texto').textContent = 'Actualizar Registro';
  document.getElementById('btn-cancelar-edicion').hidden = false;
  document.getElementById('form-calidad').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function limpiarFormulario() {
  editandoId = null;
  document.getElementById('form-calidad').reset();
  document.getElementById('calidad-fecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('form-calidad-titulo').textContent = 'Registrar Análisis de Calidad';
  document.getElementById('btn-guardar-texto').textContent = 'Guardar Registro';
  document.getElementById('btn-cancelar-edicion').hidden = true;
  document.getElementById('calidad-error').hidden = true;
}

async function borrarRegistro(id) {
  if (!confirm('¿Eliminar este registro de calidad?')) return;
  try {
    await apiFetch(`/api/calidad/${id}`, { method: 'DELETE' });
    if (editandoId === id) limpiarFormulario();
    await cargarCalidad();
  } catch (err) {
    alert(err.message || 'No se pudo eliminar el registro');
  }
}

async function precargarOperador() {
  try {
    const { usuario } = await apiFetch('/api/auth/me');
    if (usuario) document.getElementById('calidad-operador').value = `${usuario.nombre} ${usuario.apellido}`;
  } catch (_) {
    // sin sesión no debería llegar aquí (la ruta ya exige rol ADMIN), se ignora
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('calidad-fecha').value = new Date().toISOString().slice(0, 10);
  precargarOperador();
  cargarCalidad();

  document.getElementById('buscar-calidad').addEventListener('input', renderTabla);
  document.getElementById('btn-cancelar-edicion').addEventListener('click', limpiarFormulario);

  document.getElementById('form-calidad').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('calidad-error');
    errorEl.hidden = true;

    const cuerpo = {
      fecha: document.getElementById('calidad-fecha').value,
      lote: document.getElementById('calidad-lote').value,
      operador: document.getElementById('calidad-operador').value,
      ph: document.getElementById('calidad-ph').value,
      turbiedad: document.getElementById('calidad-turbiedad').value,
      conductividad: document.getElementById('calidad-conductividad').value,
      tds: document.getElementById('calidad-tds').value,
    };

    try {
      if (editandoId) {
        await apiFetch(`/api/calidad/${editandoId}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
      } else {
        await apiFetch('/api/calidad', { method: 'POST', body: JSON.stringify(cuerpo) });
      }
      limpiarFormulario();
      await cargarCalidad();
    } catch (err) {
      errorEl.textContent = err.message || 'No se pudo guardar el registro';
      errorEl.hidden = false;
    }
  });
});
