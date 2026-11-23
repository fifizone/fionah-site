/* fionah — "Send your photos" box
   ============ EDIT ME ============
   Paste the Google Apps Script web-app link between the quotes to switch sending on.
   Leave it empty and the Send button stays off ("Sending opens soon").            */
const SEND_URL = "https://script.google.com/macros/s/AKfycbw2oT-nZbNCAQf3ee0gAgoXJjKUPFwYhAC4bE25h_-nZVOwmg0u1jZrh6nSTxhlCKYNyg/exec";
/* ================================= */

/* Safety guard wording (Fi to approve the exact words) */
const STOP_MSG = "One or more of your images has been red flagged, so this order has been stopped. If you think this is a mistake, email orders@fionah.com.";
const BUSY_MSG = "We're very busy right now. Please try again in about an hour.";
const WORDS_MSG = "Please change the words in the address or message. fionah doesn't accept rude, sexual or violent words.";
const guard = window.fionahSafety;   // safety/safety.js (Guard 1 photos + Guard 3 words)
{
  const box = document.querySelector('.sendbox:not(.getbox)');
  if (box) {
    const $ = s => box.querySelector(s);
    const MAX = 15;                    // photos per send (matches the packs: up to 15 images per video)
    let photos = [];                   // { file, url }
    const pick = { len: '', music: 'Yes' };
    const segs = [['#sbLen', 'len'], ['#sbMusic', 'music']];
    segs.forEach(([sel, key]) => box.querySelectorAll(sel + ' button').forEach(b => {
      b.classList.toggle('on', b.dataset.v === pick[key]);
      b.addEventListener('click', () => { pick[key] = b.dataset.v; box.querySelectorAll(sel + ' button').forEach(x => x.classList.toggle('on', x === b)); check(); });
    }));

    // letter counters (same limits as the app: address 25, notes 40)
    box.querySelectorAll('input[data-lim]').forEach(inp => {
      const out = inp.parentElement.querySelector('.cnt[data-for="' + inp.id + '"]');
      const upd = () => { out.textContent = inp.value.length + ' / ' + inp.dataset.lim; };
      inp.addEventListener('input', upd); upd();
    });

    // photo buttons
    $('#sbTake').addEventListener('click', () => $('#sbCam').click());
    $('#sbPick').addEventListener('click', () => $('#sbFiles').click());
    let stopped = false, checking = false;
    // Safety guard: an unacceptable photo stops the whole order (Fi's choice: stop + refund)
    function stopOrder() {
      stopped = true;
      photos.forEach(p => URL.revokeObjectURL(p.url)); photos = [];
      box.classList.add('is-stopped');
      box.querySelectorAll('button, input').forEach(el => { el.disabled = true; });
      let m = box.querySelector('.stopmsg');
      if (!m) { m = document.createElement('p'); m.className = 'stopmsg'; m.setAttribute('role', 'alert'); $('.note').after(m); }
      m.textContent = STOP_MSG;
      draw();
    }
    const add = async list => {
      if (stopped) return;
      checking = true;
      const files = [...list].filter(f => f.type.startsWith('image/'));
      for (let i = 0; i < files.length; i++) {
        if (photos.length >= MAX) break;
        $('.note').textContent = `Checking photo ${i + 1} of ${files.length}…`;
        const r = guard ? await guard.checkFile(files[i]) : { ok: true };
        if (!r.ok) { checking = false; return stopOrder(); }
        photos.push({ file: files[i], url: URL.createObjectURL(files[i]) });
        draw();
      }
      checking = false;
      draw();
    };
    $('#sbCam').addEventListener('change', e => { add(e.target.files); e.target.value = ''; });
    $('#sbFiles').addEventListener('change', e => { add(e.target.files); e.target.value = ''; });

    function draw() {
      $('.thumbs').innerHTML = photos.map((p, i) =>
        `<div class="thumb"><img src="${p.url}" alt="Photo ${i + 1}"><span class="n">${i + 1}</span><button type="button" class="rm" data-i="${i}" aria-label="Remove photo ${i + 1}">×</button>
          <div class="mv"><button type="button" data-i="${i}" data-d="-1" aria-label="Move photo ${i + 1} earlier" ${i ? '' : 'style="visibility:hidden"'}>‹</button><button type="button" data-i="${i}" data-d="1" aria-label="Move photo ${i + 1} later" ${i < photos.length - 1 ? '' : 'style="visibility:hidden"'}>›</button></div></div>`).join('');
      $('.thumbs').querySelectorAll('.rm').forEach(b => b.addEventListener('click', () => {
        const i = Number(b.dataset.i); URL.revokeObjectURL(photos[i].url); photos.splice(i, 1); draw();
      }));
      $('.thumbs').querySelectorAll('.mv button').forEach(b => b.addEventListener('click', () => {
        const i = Number(b.dataset.i), k = i + Number(b.dataset.d); [photos[i], photos[k]] = [photos[k], photos[i]]; draw();
      }));
      $('.ordnote').style.display = photos.length > 1 ? 'block' : 'none';
      $('.count').textContent = photos.length ? `${photos.length} of ${MAX} photos added` : `Add up to ${MAX} photos`;
      check();
    }

    // ---------- pack code: proves the pack was paid for, and how many videos are left ----------
    // The thank-you page gets it from the helper after Stripe confirms the payment. One video is used per send.
    const normPack = v => { v = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v.startsWith('PK')) v = v.slice(2); return v ? 'PK-' + v : ''; };
    const okPack = v => /^PK-[A-Z0-9]{6}$/.test(v);
    let pack = { code: '', left: 0 };
    const packNote = (t, ok) => { const n = $('.packnote'); n.textContent = t; n.classList.toggle('ok', !!ok); };
    async function checkPack() {
      const v = normPack($('#sbPack').value);
      pack = { code: '', left: 0 };
      if (!okPack(v)) { packNote(v ? 'Pack codes look like PK-7K3Q2X.' : ''); check(); return; }
      if (!SEND_URL) { check(); return; }
      packNote('Checking your pack code…');
      try {
        const d = await (await fetch(SEND_URL + '?packinfo=1&pack=' + encodeURIComponent(v))).json();
        if (!d.ok) packNote("That pack code wasn't found. Please check it and try again.");
        else if (d.left < 1) packNote('This pack has no videos left. You can buy another pack on the home page.');
        else { pack = { code: v, left: d.left }; packNote(`${d.left} of ${d.total} video${d.total === 1 ? '' : 's'} left in this pack`, true); try { localStorage.setItem('fionah-pack', v); } catch (e) {} }
      } catch (err) { packNote('Something went wrong. Please check your internet and try again.'); }
      check();
    }
    let packT = 0;
    $('#sbPack').addEventListener('input', () => { clearTimeout(packT); packT = setTimeout(checkPack, 500); });
    box.fillPack = v => { $('#sbPack').value = v; checkPack(); };   // used by the thank-you page
    try { const saved = localStorage.getItem('fionah-pack'); if (saved && !new URLSearchParams(location.search).get('session_id')) setTimeout(() => box.fillPack(saved), 0); } catch (e) {}

    const okEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const wordsOk = () => !guard || guard.checkWords($('#sbAddr').value + ' ' + $('#sbNotes').value).ok;
    function check() {
      if (stopped) { $('.send').disabled = true; $('.note').textContent = ''; return; }
      if (checking) { $('.send').disabled = true; return; }
      const em = $('#sbEmail').value.trim();
      const words = wordsOk();
      const agreed = $('#sbAgree').checked;
      const filled = (!em || okEmail(em)) && photos.length && pick.len;
      const paid = pack.code && pack.left > 0;
      const ready = paid && filled && words && agreed;
      $('.send').disabled = !SEND_URL || !ready;
      $('.note').textContent = !SEND_URL ? 'Sending opens soon.'
        : !paid ? 'Enter your pack code to send your photos.'
        : !words ? WORDS_MSG
        : !filled ? 'Choose a video length and add at least one photo.'
        : !agreed ? 'Please tick to agree to the Terms.' : 'Ready to send.';
      $('.note').classList.toggle('warnnote', !!SEND_URL && !words);
    }
    box.querySelectorAll('input').forEach(i => i.addEventListener('input', check));

    // shrink a photo to max 2400px so it sends quickly
    const shrink = f => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 2400 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.88).split(',')[1]);
      };
      img.onerror = rej; img.src = URL.createObjectURL(f);
    });

    box.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      if ($('.send').disabled || stopped || !wordsOk() || !$('#sbAgree').checked) return;
      // private order code, e.g. FN-7K3Q2X (no names kept)
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', rnd = new Uint32Array(6); crypto.getRandomValues(rnd);
      const code = 'FN-' + Array.from(rnd, n => A[n % A.length]).join('');
      const order = { id: code, pack: pack.code, email: $('#sbEmail').value.trim(),
                      address: $('#sbAddr').value.trim(), notes: $('#sbNotes').value.trim(), length: pick.len, music: pick.music };
      $('.send').disabled = true; $('.prog').style.display = 'block';
      try {
        // get the next order number from the Google script (e.g. 1042)
        $('.note').textContent = 'Getting your order number…';
        const rr = await fetch(SEND_URL + '?reserve=1&code=' + encodeURIComponent(code) + '&pack=' + encodeURIComponent(pack.code));
        const rj = await rr.json();
        if (rj.nopack) { packNote('This pack has no videos left. You can buy another pack on the home page.'); pack.left = 0; throw new Error('no pack'); }
        if (rj.busy) { $('.prog').style.display = 'none'; $('.note').textContent = BUSY_MSG; $('.send').disabled = false; return; }
        order.number = String(rj.number || '');
        if (!order.number) throw new Error('no number');
        for (let i = 0; i < photos.length; i++) {
          $('.note').textContent = `Sending photo ${i + 1} of ${photos.length}…`;
          const data = await shrink(photos[i].file);
          await fetch(SEND_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ ...order, index: i + 1, total: photos.length, data }) });
          $('.prog i').style.width = Math.round((i + 1) / photos.length * 100) + '%';
          // Guard 2: ask the helper whether Google's check stopped this order
          try {
            const st = await (await fetch(SEND_URL + '?status=1&code=' + encodeURIComponent(code))).json();
            if (st && st.blocked) { $('.prog').style.display = 'none'; return stopOrder(); }
          } catch (err) { /* can't ask — the helper still holds back anything it blocked */ }
        }
        $('.done .onum').textContent = '#' + order.number;
        $('.done .code').textContent = code;
        pack.left -= 1;
        box.classList.add('is-done');
      } catch (err) {
        $('.note').textContent = 'Something went wrong. Please check your internet and tap Send again.';
        $('.send').disabled = false;
      }
    });

    draw();
  }
}

/* "Get your video" page: the order board.
   Each day's order numbers show as tiles. A tile turns chrome when that video is ready.
   Tap your number, enter your private code, download. */
{
  const g = document.querySelector('.getbox');
  if (g) {
    const $ = s => g.querySelector(s);
    const board = $('.board'), out = $('.result'), form = g.querySelector('form');
    let picked = '';
    const norm = v => { v = v.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v.startsWith('FN')) v = v.slice(2); return v ? 'FN-' + v : ''; };

    async function loadBoard() {
      if (!SEND_URL) { board.innerHTML = '<p class="bnote">The order board opens soon.</p>'; return; }
      board.innerHTML = '<p class="bnote">Loading today\'s orders…</p>';
      try {
        const d = await (await fetch(SEND_URL + '?board=1')).json();
        const days = d.days || [];
        if (!days.some(x => x.orders.length)) { board.innerHTML = '<p class="bnote">No orders yet today.</p>'; return; }
        board.innerHTML = days.filter(x => x.orders.length).map(x =>
          `<div class="bday">${x.label}</div><div class="tiles">` +
          x.orders.map(o => `<button type="button" class="tile${o.ready ? ' ready' : ''}" data-n="${o.n}" ${o.ready ? '' : 'aria-disabled="true"'} aria-label="Order ${o.n}${o.ready ? ', ready' : ', not ready yet'}">#${o.n}</button>`).join('') +
          '</div>').join('');
        board.querySelectorAll('.tile').forEach(t => t.addEventListener('click', () => {
          if (!t.classList.contains('ready')) { out.textContent = `Order #${t.dataset.n} isn't ready yet. Please check back soon.`; form.hidden = true; return; }
          picked = t.dataset.n;
          board.querySelectorAll('.tile').forEach(x => x.classList.toggle('picked', x === t));
          $('#gNum').textContent = '#' + picked; form.hidden = false; out.textContent = ''; $('#gCode').focus();
        }));
      } catch (err) { board.innerHTML = '<p class="bnote">Something went wrong. Please check your internet and refresh.</p>'; }
    }

    $('#gCode').addEventListener('input', () => { $('.gbtn').disabled = norm($('#gCode').value).length < 9; });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const code = norm($('#gCode').value);
      if (!SEND_URL || !picked || code.length < 9) return;
      out.textContent = 'Checking…';
      try {
        const d = await (await fetch(SEND_URL + '?n=' + encodeURIComponent(picked) + '&code=' + encodeURIComponent(code))).json();
        if (d.status === 'ready') {
          out.innerHTML = '<a class="sbtn hl" href="' + d.url + '">Download your video</a>' +
            '<button type="button" class="sbtn hl" id="gDone">Delete my files</button>';
          $('#gDone').addEventListener('click', async () => {
            try { await fetch(SEND_URL + '?n=' + encodeURIComponent(picked) + '&code=' + encodeURIComponent(code) + '&done=1'); } catch (err) {}
            out.innerHTML = '<p>All done. Your photos and video have been deleted. Thank you!</p>'; form.hidden = true; loadBoard();
          });
        } else if (d.status === 'waiting') {
          out.textContent = 'Your video is on its way. Please check back soon.';
        } else {
          out.textContent = "That code doesn't match this order number. Please check it and try again.";
        }
      } catch (err) { out.textContent = 'Something went wrong. Please check your internet and try again.'; }
    });

    loadBoard();
  }
}

/* Thank-you page: Stripe sends the buyer here with ?session_id=cs_…
   The helper checks the payment with Stripe and gives back the pack code (the same code if the page is opened again). */
{
  const card = document.getElementById('packCard');
  const sid = new URLSearchParams(location.search).get('session_id');
  if (card && SEND_URL && sid && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sid)) {
    card.hidden = false;
    const left = document.getElementById('packLeft'), codeEl = document.getElementById('packCode');
    const ask = async () => {
      left.textContent = 'Checking your payment…'; codeEl.textContent = '';
      try {
        const d = await (await fetch(SEND_URL + '?pack=' + encodeURIComponent(sid))).json();
        if (!d.ok) throw new Error('not paid');
        codeEl.textContent = d.code;
        left.textContent = `${d.left} of ${d.total} video${d.total === 1 ? '' : 's'} left to send`;
        const sb = document.querySelector('.sendbox:not(.getbox)'); if (sb && sb.fillPack) sb.fillPack(d.code);
        try { localStorage.setItem('fionah-pack', d.code); } catch (e) {}
      } catch (err) {
        left.innerHTML = 'We couldn\'t confirm your payment yet. <a href="#" id="packTry">Try again</a><br>Still not working? Email <a class="mail" href="mailto:accounts@fionah.com">accounts@fionah.com</a> with your receipt.';
        document.getElementById('packTry').onclick = e => { e.preventDefault(); ask(); };
      }
    };
    ask();
  }
}
