// Contact Us (Fi, 28 Nov 2026): tapping an email address opens a message form instead of an email app.
// Orders or Payments: the customer uses their Order Number + Private Code, or their Emailed Stripe Receipt Number.
// No email address is asked for or kept. Fi's reply shows here (Check For A Reply) and on Collect My Video.
// General questions go to the public Questions and Answers page.
(function () {
  var URL = 'https://script.google.com/macros/s/AKfycbw2oT-nZbNCAQf3ee0gAgoXJjKUPFwYhAC4bE25h_-nZVOwmg0u1jZrh6nSTxhlCKYNyg/exec';
  var BASE = /\/app\//.test(location.pathname) ? '../' : '';
  var css =
    '#cuBack{position:fixed;inset:0;z-index:200;background:rgba(10,10,14,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px}' +
    '#cuBox{background:#fff;color:#111014;font:16px/1.5 Arial,Arimo,Helvetica,sans-serif;width:100%;max-width:520px;border-radius:8px;padding:22px 20px 18px;box-shadow:6px 6px 0 #A9B0BC;position:relative}' +
    '#cuBox h2{margin:0 0 6px;font-size:24px}#cuBox p{margin:8px 0}#cuBox label{display:block;font-weight:700;margin:14px 0 6px}' +
    '#cuBox input,#cuBox textarea{width:100%;box-sizing:border-box;font:inherit;padding:11px 12px;border:1.5px solid #B9BFC9;border-radius:4px;background:#F7F6FB;color:#111014}' +
    '#cuBox textarea{min-height:110px;resize:vertical}' +
    '#cuBox .cuRow{display:flex;gap:8px;flex-wrap:wrap}#cuBox .cuRow button{flex:1 1 140px}' +
    '#cuBox button{font:700 16px Arial,Arimo,Helvetica,sans-serif;padding:12px 10px;border-radius:4px;border:2px solid #4B33C4;background:#fff;color:#111014;cursor:pointer;box-shadow:4px 4px 0 #A9B0BC}' +
    '#cuBox button.on,#cuBox button.cuMain{background:#4B33C4;color:#fff}#cuBox button:disabled{opacity:.5;cursor:not-allowed}' +
    '#cuBox .cuClose{position:absolute;top:10px;right:10px;box-shadow:none;border:none;font-size:26px;line-height:1;padding:4px 10px;background:none;color:#111014}' +
    '#cuBox .cuNote{font-size:14px;color:#444}#cuBox .cuCount{text-align:right;font-size:14px;color:#444}' +
    '#cuBox .cuMsg{font-weight:700;margin-top:12px}#cuBox .cuItem{border:1.5px solid #E2E0EA;border-radius:6px;padding:10px 12px;margin:10px 0}' +
    '#cuBox .cuItem b{display:block}#cuBox .cuReply{background:#F3F0FF;border-radius:4px;padding:8px 10px;margin-top:6px}' +
    '#cuBox a.cuLink{display:inline-block;margin-top:8px;font-weight:700;color:#4B33C4}';
  var st = { to: 'orders', by: 'order' };
  function el(h) { var d = document.createElement('div'); d.innerHTML = h; return d.firstChild; }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function open(to) {
    if (!document.getElementById('cuStyle')) { var s = document.createElement('style'); s.id = 'cuStyle'; s.textContent = css; document.head.appendChild(s); }
    close();
    st.to = to || 'orders';
    var back = el('<div id="cuBack" role="dialog" aria-modal="true" aria-labelledby="cuTitle"><div id="cuBox">' +
      '<button type="button" class="cuClose" aria-label="Close">×</button>' +
      '<h2 id="cuTitle">Contact Us</h2>' +
      '<label>What is it about?</label>' +
      '<div class="cuRow" id="cuTo"><button type="button" data-v="orders">My Order</button><button type="button" data-v="accounts">A Payment Or Refund</button><button type="button" data-v="general">A General Question</button></div>' +
      '<div id="cuGeneral" hidden><p>General questions are answered on our Questions And Answers page, so everyone can see the answer.</p>' +
      '<a class="cuLink" href="' + BASE + 'qa.html">Go To Questions And Answers</a></div>' +
      '<div id="cuForm"><label>How shall we find your order?</label>' +
      '<div class="cuRow" id="cuBy"><button type="button" data-v="order">Order Number And Private Code</button><button type="button" data-v="receipt">Emailed Stripe Receipt Number</button></div>' +
      '<div id="cuOrder"><label for="cuN">Order Number:</label><input id="cuN" inputmode="numeric" maxlength="8" placeholder="e.g. 1001" autocomplete="off">' +
      '<label for="cuC">Private Code:</label><input id="cuC" maxlength="12" placeholder="FN-XXXXXX" autocomplete="off" autocapitalize="characters"></div>' +
      '<div id="cuRcpt" hidden><label for="cuR">Emailed Stripe Receipt Number:</label><input id="cuR" maxlength="20" placeholder="e.g. #1234-5678" autocomplete="off"></div>' +
      '<label for="cuT">Your message (500 characters):</label><textarea id="cuT" maxlength="500" placeholder="Please tell us what happened."></textarea>' +
      '<div class="cuCount"><span id="cuLen">0</span> / 500</div>' +
      '<p class="cuNote">Please do not send your credit card number or password. We do not need your personal information.</p>' +
      '<div class="cuRow"><button type="button" class="cuMain" id="cuSend" disabled>Send Message</button><button type="button" id="cuCheck" disabled>Check For A Reply</button></div>' +
      '<div class="cuMsg" id="cuOut" role="status"></div><div id="cuList"></div></div>' +
      '</div></div>');
    document.body.appendChild(back);
    var $ = function (q) { return back.querySelector(q); };
    function seg(id, key) {
      back.querySelectorAll('#' + id + ' button').forEach(function (b) {
        b.classList.toggle('on', b.dataset.v === st[key]);
        b.addEventListener('click', function () { st[key] = b.dataset.v; draw(); });
      });
    }
    function nums() {
      if (st.by === 'order') return { n: $('#cuN').value.replace(/\D/g, ''), code: $('#cuC').value.trim().toUpperCase() };
      return { ref: $('#cuR').value.trim() };
    }
    function okNums() { var x = nums(); return st.by === 'order' ? (x.n.length >= 4 && /^FN-[A-Z0-9]{6}$/.test(x.code)) : x.ref.replace(/\D/g, '').length === 8; }
    function draw() {
      back.querySelectorAll('#cuTo button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === st.to); });
      back.querySelectorAll('#cuBy button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === st.by); });
      $('#cuGeneral').hidden = st.to !== 'general'; $('#cuForm').hidden = st.to === 'general';
      $('#cuOrder').hidden = st.by !== 'order'; $('#cuRcpt').hidden = st.by !== 'receipt';
      $('#cuLen').textContent = $('#cuT').value.length;
      $('#cuCheck').disabled = !okNums();
      $('#cuSend').disabled = !okNums() || $('#cuT').value.trim().length < 3;
    }
    function q(o) { return Object.keys(o).map(function (k) { return k + '=' + encodeURIComponent(o[k]); }).join('&'); }
    function show(items) {
      $('#cuList').innerHTML = items.length ? items.map(function (m) {
        return '<div class="cuItem"><b>' + esc(m.id) + ' · ' + esc(m.when) + ' · ' + esc(m.to) + '</b>' + esc(m.text) +
          '<div class="cuReply">' + (m.reply ? '<b>Our reply:</b>' + esc(m.reply) : 'We have your message. Our reply will show here soon.') + '</div></div>';
      }).join('') : '';
    }
    function check() {
      $('#cuOut').textContent = 'Checking…';
      fetch(URL + '?' + q(Object.assign({ replies: 1 }, nums()))).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.ok) { $('#cuOut').textContent = 'We could not find those numbers. Please check them and try again.'; show([]); return; }
        $('#cuOut').textContent = d.items.length ? 'Your messages:' : 'There are no messages for these numbers yet.';
        show(d.items);
      }).catch(function () { $('#cuOut').textContent = 'Something went wrong. Please check your internet connection and try again.'; });
    }
    seg('cuTo', 'to'); seg('cuBy', 'by');
    ['#cuN', '#cuC', '#cuR', '#cuT'].forEach(function (s) { $(s).addEventListener('input', draw); });
    $('#cuSend').addEventListener('click', function () {
      $('#cuSend').disabled = true; $('#cuOut').textContent = 'Sending…';
      fetch(URL + '?' + q(Object.assign({ contact: 1, to: st.to, text: $('#cuT').value.trim() }, nums()))).then(function (r) { return r.json(); }).then(function (d) {
        if (d.ok) { $('#cuT').value = ''; draw(); $('#cuOut').textContent = 'Thank you. Your message ' + d.id + ' was sent. Our reply will show here: tap Check For A Reply with the same numbers.' + (st.by === 'order' ? ' It also shows on Collect My Video.' : ''); return check(); }
        if (d.flagged) $('#cuOut').textContent = 'Your message was red flagged because it has words that are not allowed under our Terms. Please reword it.';
        else if (d.notfound) $('#cuOut').textContent = 'We could not find those numbers. Please check them and try again.';
        else if (d.busy) $('#cuOut').textContent = 'We are very busy right now. Please try again in an hour.';
        else $('#cuOut').textContent = 'Please write a little more in your message.';
        draw();
      }).catch(function () { $('#cuOut').textContent = 'Something went wrong. Please check your internet connection and try again.'; draw(); });
    });
    $('#cuCheck').addEventListener('click', check);
    $('.cuClose').addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', esc1);
    draw();
    (st.to === 'general' ? $('.cuLink') : $('#cuTo button.on')).focus();
  }
  function esc1(e) { if (e.key === 'Escape') close(); }
  function close() { var b = document.getElementById('cuBack'); if (b) b.remove(); document.removeEventListener('keydown', esc1); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="mailto:"], [data-contact]');
    if (!a) return;
    e.preventDefault();
    var addr = (a.getAttribute('href') || '').replace(/^mailto:/, '');
    open(a.dataset.contact || (/^accounts@/i.test(addr) ? 'accounts' : /^orders@/i.test(addr) ? 'orders' : 'general'));
  });
  window.fionahContact = open;
})();
