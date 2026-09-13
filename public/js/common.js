// Utilidades compartidas por todas las vistas.

function formatCLP(valor) {
  return '$' + Number(valor || 0).toLocaleString('es-CL');
}

function formatFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 401 && !url.startsWith('/api/auth/')) {
    window.location.href = '/login';
    throw new Error('No autenticado');
  }

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // sin cuerpo JSON
  }

  if (!res.ok) {
    throw new Error((data && data.error) || `Error ${res.status}`);
  }
  return data;
}

function wireLogout() {
  const link = document.getElementById('logout-link');
  if (!link) return;
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  });
}

const ESTADO_LABEL = {
  PENDIENTE: 'Pendiente',
  PREPARANDO: 'Preparando',
  LISTO: 'Listo',
  EN_RUTA: 'En ruta',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

const ESTADO_BADGE_CLASS = {
  PENDIENTE: 'bg-surface-variant text-on-surface-variant',
  PREPARANDO: 'bg-primary-fixed text-on-primary-fixed',
  LISTO: 'bg-secondary-fixed text-on-secondary-fixed',
  EN_RUTA: 'bg-primary-fixed-dim text-on-primary-fixed',
  ENTREGADO: 'bg-tertiary-fixed text-on-tertiary-fixed',
  CANCELADO: 'bg-error-container text-on-error-container',
};

document.addEventListener('DOMContentLoaded', wireLogout);
