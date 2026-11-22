/* fionah — "Send your photos" box
   ============ EDIT ME ============
   Paste the Google Apps Script web-app link between the quotes to switch sending on.
   Leave it empty and the Send button stays off ("Sending opens soon").            */
const SEND_URL = "https://script.google.com/macros/s/AKfycbw2oT-nZbNCAQf3ee0gAgoXJjKUPFwYhAC4bE25h_-nZVOwmg0u1jZrh6nSTxhlCKYNyg/exec";
/* ================================= */
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
    const add = list => {
      for (const f of list) {
        if (!f.type.startsWith('image/')) continue;
        if (photos.length >= MAX) break;
        photos.push({ file: f, url: URL.createObjectURL(f) });
      }
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

    const okEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    function check() {
      const em = $('#sbEmail').value.trim();
      const ready = (!em || okEmail(em)) && photos.length && pick.len;
      $('.send').disabled = !SEND_URL || !ready;
      $('.note').textContent = !SEND_URL ? 'Sending opens soon.'
        : ready ? 'Ready to send.' : 'Choose a video length and add at least one photo.';
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
      if ($('.send').disabled) return;
      // private order code, e.g. FN-7K3Q2X (no names kept)
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', rnd = new Uint32Array(6); crypto.getRandomValues(rnd);
      const code = 'FN-' + Array.from(rnd, n => A[n % A.length]).join('');
      const order = { id: code, email: $('#sbEmail').value.trim(),
                      address: $('#sbAddr').value.trim(), notes: $('#sbNotes').value.trim(), length: pick.len, music: pick.music };
      $('.send').disabled = true; $('.prog').style.display = 'block';
      try {
        // get the next order number from the Google script (e.g. 1042)
        $('.note').textContent = 'Getting your order number…';
        const rr = await fetch(SEND_URL + '?reserve=1&code=' + encodeURIComponent(code));
        order.number = String((await rr.json()).number || '');
        if (!order.number) throw new Error('no number');
        for (let i = 0; i < photos.length; i++) {
          $('.note').textContent = `Sending photo ${i + 1} of ${photos.length}…`;
          const data = await shrink(photos[i].file);
          await fetch(SEND_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ ...order, index: i + 1, total: photos.length, data }) });
          $('.prog i').style.width = Math.round((i + 1) / photos.length * 100) + '%';
        }
        $('.done .onum').textContent = '#' + order.number;
        $('.done .code').textContent = code;
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
