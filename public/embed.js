/* =====================================================================
   Lume · Widget de Agendamento (embed)
   Cole no seu site:
     <script src="https://SEU-DOMINIO/embed.js" data-lume-slug="amanda-costa" defer></script>
     <button data-lume-agendar>Agendar horário</button>
   Qualquer elemento com [data-lume-agendar] abre o popup de agendamento.
   Para vários profissionais, use data-lume-slug no próprio botão.
   ===================================================================== */
(function () {
  var thisScript = document.currentScript;
  var ORIGIN = (function () {
    try { return new URL(thisScript.src).origin; } catch (e) { return ''; }
  })();
  var DEFAULT_SLUG = (thisScript && thisScript.getAttribute('data-lume-slug')) || '';

  var overlay = null;

  function buildUrl(slug) {
    return ORIGIN + '/agendar/' + encodeURIComponent(slug) + '?embed=true';
  }

  function close() {
    if (!overlay) return;
    overlay.style.opacity = '0';
    var el = overlay;
    overlay = null;
    setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 200);
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  function open(slug) {
    slug = (slug || DEFAULT_SLUG || '').trim();
    if (!slug) { console.error('[Lume] Defina data-lume-slug no <script> ou no botão.'); return; }
    if (overlay) close();

    overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:rgba(26,14,18,0.55)', '-webkit-backdrop-filter:blur(6px)', 'backdrop-filter:blur(6px)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:0', 'opacity:0', 'transition:opacity .2s ease',
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif'
    ].join(';');

    var card = document.createElement('div');
    card.style.cssText = [
      'position:relative', 'background:#fff', 'width:100%', 'max-width:540px',
      'height:100%', 'max-height:100%', 'overflow:hidden',
      'box-shadow:0 30px 80px -20px rgba(38,4,10,.5)'
    ].join(';');

    // Responsivo: em telas maiores vira um cartão arredondado centralizado
    var mq = window.matchMedia('(min-width: 640px)');
    function applySize() {
      if (mq.matches) {
        card.style.height = 'min(86vh, 760px)';
        card.style.borderRadius = '28px';
        card.style.maxHeight = '86vh';
        overlay.style.alignItems = 'center';
      } else {
        card.style.height = '90vh';
        card.style.borderRadius = '28px 28px 0 0';
        card.style.maxHeight = '90vh';
        overlay.style.alignItems = 'flex-end';
      }
    }
    applySize();
    if (mq.addEventListener) mq.addEventListener('change', applySize);

    var closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.innerHTML = '&#10005;';
    closeBtn.style.cssText = [
      'position:absolute', 'top:12px', 'right:12px', 'z-index:2',
      'width:36px', 'height:36px', 'border:none', 'cursor:pointer',
      'border-radius:9999px', 'background:rgba(255,255,255,.9)', 'color:#500b18',
      'font-size:16px', 'line-height:1', 'box-shadow:0 4px 14px rgba(0,0,0,.15)'
    ].join(';');
    closeBtn.onclick = close;

    var frame = document.createElement('iframe');
    frame.src = buildUrl(slug);
    frame.title = 'Agendamento';
    frame.setAttribute('allow', 'clipboard-write');
    frame.style.cssText = 'border:0;width:100%;height:100%;display:block;background:#fff';

    card.appendChild(closeBtn);
    card.appendChild(frame);
    overlay.appendChild(card);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { if (overlay) overlay.style.opacity = '1'; });
  }

  // Clique em qualquer elemento [data-lume-agendar]
  document.addEventListener('click', function (e) {
    var t = e.target;
    var el = t && t.closest ? t.closest('[data-lume-agendar]') : null;
    if (el) {
      e.preventDefault();
      open(el.getAttribute('data-lume-slug') || DEFAULT_SLUG);
    }
  });

  // Fecha no ESC
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  // Mensagens vindas do agendamento (ex.: concluído)
  window.addEventListener('message', function (ev) {
    if (!ev.data || typeof ev.data !== 'object') return;
    if (ev.data.type === 'lume:booked' && typeof window.lumeOnBooked === 'function') {
      try { window.lumeOnBooked(ev.data); } catch (_) {}
    }
    if (ev.data.type === 'lume:close') close();
  });

  // API programática: LumeAgenda.open('slug') / .close()
  window.LumeAgenda = { open: open, close: close };
})();
