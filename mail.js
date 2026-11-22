// Tapping an email address: opens the email app (if there is one) AND copies the address,
// so laptop users without an email app can paste it. Shows a small "copied" note.
(function () {
  function note(text) {
    var n = document.getElementById('mailCopied');
    if (!n) {
      n = document.createElement('div');
      n.id = 'mailCopied';
      n.setAttribute('role', 'status');
      n.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99;' +
        'background:#111014;color:#fff;font:700 16px Arial,Arimo,Helvetica,sans-serif;padding:12px 18px;' +
        'border-radius:4px;box-shadow:4px 4px 0 #A9B0BC;max-width:90vw;text-align:center;transition:opacity .3s';
      document.body.appendChild(n);
    }
    n.textContent = text; n.style.opacity = '1';
    clearTimeout(n._t); n._t = setTimeout(function () { n.style.opacity = '0'; }, 3500);
  }
  function copy(addr) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(addr);
    var t = document.createElement('textarea'); t.value = addr; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } finally { t.remove(); }
    return Promise.resolve();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a) return;
    var addr = a.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
    copy(addr).then(function () { note('Email address copied ✓  ' + addr); },
                    function () { note('Our email: ' + addr); });
  });
})();
