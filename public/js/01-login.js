document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-login');
  const errorEl = document.getElementById('login-error');
  const boton = document.getElementById('btn-login');
  const botonTexto = document.getElementById('btn-login-texto');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    boton.disabled = true;
    botonTexto.textContent = 'Ingresando...';

    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      window.location.href = data.redirectTo || '/';
    } catch (err) {
      errorEl.textContent = err.message || 'No se pudo iniciar sesión';
      errorEl.hidden = false;
      boton.disabled = false;
      botonTexto.textContent = 'Iniciar Sesión';
    }
  });
});
