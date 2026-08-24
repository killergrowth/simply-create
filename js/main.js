// Simply Create KC — main.js

// Mobile nav toggle
(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', function () {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
})();

// Contact form handler (used on multiple pages)
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const successEl = document.getElementById('form-success');
    const errorEl = document.getElementById('form-error');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    if (errorEl) errorEl.classList.remove('visible');

    try {
      const res = await fetch('/submit', {
        method: 'POST',
        body: new FormData(form),
      });
      const data = await res.json();
      if (data.ok) {
        form.style.display = 'none';
        if (successEl) successEl.classList.add('visible');
      } else {
        throw new Error(data.error || 'Something went wrong.');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Send Message';
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.classList.add('visible');
      }
      if (window.turnstile) window.turnstile.reset();
    }
  });
})();
