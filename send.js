/* fionah — "Send your photos" box
   ============ EDIT ME ============
   Paste the Google Apps Script web-app link between the quotes to switch sending on.
   Leave it empty and the Send button stays off ("Sending opens soon").            */
const SEND_URL = "https://script.google.com/macros/s/AKfycbw2oT-nZbNCAQf3ee0gAgoXJjKUPFwYhAC4bE25h_-nZVOwmg0u1jZrh6nSTxhlCKYNyg/exec";
/* ================================= */

/* Safety guard wording (Fi to approve the exact words) */
const STOP_MSG = "One or more of your images has been red flagged, so this order has been stopped. If you think this is a mistake, email orders@fionah.com.";
const REPLACE_MSG = "This image cannot be accepted. Please choose another image in its place.";
const MAX_REFUSED = 3;   // a refused photo can be replaced; the 3rd refused photo stops the order (same rule as The Waitress)
const BUSY_MSG = "We are very busy right now. Please try again in about an hour.";
const WORDS_MSG = "Please change the words in the address or message. fionah does not accept rude, sexual or violent words.";
const guard = window.fionahSafety;   // safety/safety.js (Guard 1 photos + Guard 3 words)
{
  const box = document.querySelector('.sendbox:not(.getbox)');
  if (box) {
    const $ = s => box.querySelector(s);
    let MAX = 15;                      // photos per send: Starter 10, Standard + Agent Pack 15 (set from the pack code)
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
    let stopped = false, checking = false, refusedN = 0;
    // Safety guard (Fi, 26 Nov): a refused photo is not used and the customer chooses another in its place;
    // the 3rd refused photo stops the whole order
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
        $('.note').textContent = `Checking image ${i + 1} of ${files.length}…`;
        const r = guard ? await guard.checkFile(files[i]) : { ok: true };
        if (!r.ok) {
          refusedN += 1;
          if (refusedN >= MAX_REFUSED) { checking = false; return stopOrder(); }
          showReplace(REPLACE_MSG, false); continue;          // this photo is not added; the others carry on
        }
        photos.push({ file: files[i], url: URL.createObjectURL(files[i]) });
        draw();
      }
      checking = false;
      draw();
    };
    // the "choose another photo" message (with a button while sending)
    const repIn = document.createElement('input'); repIn.type = 'file'; repIn.accept = 'image/*'; repIn.hidden = true; box.appendChild(repIn);
    function showReplace(text, withButton) {
      let m = box.querySelector('.repmsg');
      if (!m) { m = document.createElement('div'); m.className = 'repmsg'; m.setAttribute('role', 'alert'); $('.note').after(m); }
      m.innerHTML = '<p></p>' + (withButton ? '<button type="button" class="sbtn repbtn">Choose Another Image</button>' : '');
      m.querySelector('p').textContent = text; m.hidden = false;
      return m.querySelector('.repbtn');
    }
    const hideReplace = () => { const m = box.querySelector('.repmsg'); if (m) m.hidden = true; };
    // while sending: The Waitress refused photo number i, so ask for another one (checked on this device first)
    const askReplacement = i => new Promise(res => {
      const btn = showReplace(`Image ${i + 1}: ${REPLACE_MSG}`, true);
      btn.onclick = () => repIn.click();
      repIn.onchange = async () => {
        const f = repIn.files && repIn.files[0]; repIn.value = '';
        if (!f) return;
        const r = guard ? await guard.checkFile(f) : { ok: true };
        if (!r.ok) {
          refusedN += 1;
          if (refusedN >= MAX_REFUSED) { hideReplace(); stopOrder(); return res(null); }
          showReplace(`Image ${i + 1}: ${REPLACE_MSG}`, true).onclick = () => repIn.click();
          return;
        }
        hideReplace(); res(f);
      };
    });
    $('#sbCam').addEventListener('change', e => { add(e.target.files); e.target.value = ''; });
    $('#sbFiles').addEventListener('change', e => { add(e.target.files); e.target.value = ''; });

    function draw() {
      $('.thumbs').innerHTML = photos.map((p, i) =>
        `<div class="thumb"><img src="${p.url}" alt="Image ${i + 1}"><span class="n">${i + 1}</span><button type="button" class="rm" data-i="${i}" aria-label="Remove image ${i + 1}">×</button>
          <div class="mv"><button type="button" data-i="${i}" data-d="-1" aria-label="Move image ${i + 1} earlier" ${i ? '' : 'style="visibility:hidden"'}>‹</button><button type="button" data-i="${i}" data-d="1" aria-label="Move image ${i + 1} later" ${i < photos.length - 1 ? '' : 'style="visibility:hidden"'}>›</button></div></div>`).join('');
      $('.thumbs').querySelectorAll('.rm').forEach(b => b.addEventListener('click', () => {
        const i = Number(b.dataset.i); URL.revokeObjectURL(photos[i].url); photos.splice(i, 1); draw();
      }));
      $('.thumbs').querySelectorAll('.mv button').forEach(b => b.addEventListener('click', () => {
        const i = Number(b.dataset.i), k = i + Number(b.dataset.d); [photos[i], photos[k]] = [photos[k], photos[i]]; draw();
      }));
      $('.ordnote').style.display = photos.length > 1 ? 'block' : 'none';
      $('.count').textContent = photos.length ? `${photos.length} of ${MAX} images added` : `Add up to ${MAX} images`;
      check();
    }

    // ---------- Stripe receipt number: proves the order was paid for, and how many videos are left to send ----------
    // One payment = one receipt number + one order number + one private code for all the videos in the order.
    // The thank-you page fills it in. If Stripe has not sent the receipt yet, the payment's checkout id is used behind the scenes.
    const normRef = v => { v = String(v || '').trim(); if (/^cs_(test|live)_/.test(v)) return v; const dg = v.replace(/\D/g, ''); return dg.length === 8 ? dg.slice(0, 4) + '-' + dg.slice(4) : ''; };
    let pack = { ref: '', left: 0, number: '' };
    let hiddenRef = '';                                 // checkout id from the thank-you page, until the receipt number arrives
    const packNote = (t, ok) => { const n = $('.packnote'); n.textContent = t; n.classList.toggle('ok', !!ok); };
    async function checkPack() {
      const typed = $('#sbPack').value.trim();
      const v = normRef(typed) || (!typed ? hiddenRef : '');
      pack = { ref: '', left: 0, number: '' };
      if (!v) { packNote(typed ? 'Receipt numbers look like #1234-5678.' : ''); check(); return; }
      if (!SEND_URL) { check(); return; }
      packNote('Checking your receipt number…');
      try {
        const d = await (await fetch(SEND_URL + '?packinfo=1&ref=' + encodeURIComponent(v))).json();
        if (!d.ok) packNote("That receipt number was not found. Please check it and try again.");
        else if (d.left < 1) packNote(`Order #${d.number} has no videos left to send. You can buy another pack on the home page.`);
        else {
          pack = { ref: v, left: d.left, number: d.number }; MAX = d.images || 15; draw();
          packNote(`Order #${d.number} · ${d.left} of ${d.total} video${d.total === 1 ? '' : 's'} left to send`, true);
          if (d.receipt && !typed) $('#sbPack').value = d.receipt;
          try { localStorage.setItem('fionah-receipt', d.receipt || v); } catch (e) {}
        }
      } catch (err) { packNote('Something went wrong. Please check your internet connection and try again.'); }
      check();
    }
    let packT = 0;
    $('#sbPack').addEventListener('input', () => { clearTimeout(packT); packT = setTimeout(checkPack, 500); });
    box.fillPack = (receipt, sid) => { if (sid) hiddenRef = sid; if (receipt) $('#sbPack').value = receipt; checkPack(); };   // used by the thank-you page
    try { const saved = localStorage.getItem('fionah-receipt'); if (saved && !/^cs_/.test(saved) && !new URLSearchParams(location.search).get('session_id')) setTimeout(() => box.fillPack(saved), 0); } catch (e) {}

    const wordsOk = () => !guard || guard.checkWords($('#sbAddr').value + ' ' + $('#sbNotes').value).ok;
    function check() {
      if (stopped) { $('.send').disabled = true; $('.note').textContent = ''; return; }
      if (checking) { $('.send').disabled = true; return; }
      const words = wordsOk();
      const agreed = $('#sbAgree').checked;
      const filled = photos.length && photos.length <= MAX && pick.len;
      const paid = pack.ref && pack.left > 0;
      const ready = paid && filled && words && agreed;
      $('.send').disabled = !SEND_URL || !ready;
      $('.note').textContent = !SEND_URL ? 'Sending opens soon.'
        : !paid ? 'Enter your Emailed Stripe Receipt Number to send your photos.'
        : !words ? WORDS_MSG
        : photos.length > MAX ? `This pack allows up to ${MAX} photos. Please remove ${photos.length - MAX}.` : !filled ? 'Choose a video length and add at least one image.'
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
      let code = '';                     // the order's private code comes from the helper (one code for all videos in the order)
      const order = { address: $('#sbAddr').value.trim(), notes: $('#sbNotes').value.trim(), length: pick.len, music: pick.music };
      $('.send').disabled = true; $('.prog').style.display = 'block';
      try {
        // get the next order number from the Google script (e.g. 1042)
        $('.note').textContent = 'Getting your order ready…';
        const rr = await fetch(SEND_URL + '?reserve=1&ref=' + encodeURIComponent(pack.ref));
        const rj = await rr.json();
        if (rj.nopack) { packNote('This order has no videos left to send. You can buy another pack on the home page.'); pack.left = 0; throw new Error('no pack'); }
        code = rj.code; order.id = code; order.video = rj.video;
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
            if (st && st.refused === i + 1 && (!st.video || st.video === order.video)) {
              refusedN += 1;
              $('.note').textContent = '';
              const f = await askReplacement(i);
              if (!f) { $('.prog').style.display = 'none'; return; }   // order stopped (3rd refused photo)
              URL.revokeObjectURL(photos[i].url); photos[i] = { file: f, url: URL.createObjectURL(f) };
              i -= 1; continue;                                        // send the new photo in the same place
            }
          } catch (err) { /* cannot ask — the helper still holds back anything it blocked */ }
        }
        $('.done .onum').textContent = '#' + order.number;
        $('.done .code').textContent = code;
        box.querySelectorAll('.onum2').forEach(x => { x.textContent = '#' + order.number; });
        box.querySelectorAll('.done a[href="get.html"]').forEach(a => { a.href = 'get.html?n=' + order.number; });
        pack.left -= 1;
        const vn = box.querySelector('.vidnote');
        if (vn) vn.textContent = rj.total > 1 ? `Video ${rj.video} of ${rj.total} sent.${pack.left ? ` You have ${pack.left} more to send with your receipt number. Your private code stays the same.` : ''}` : '';
        box.classList.add('is-done');
      } catch (err) {
        $('.note').textContent = 'Something went wrong. Please check your internet connection and tap Send again.';
        $('.send').disabled = false;
      }
    });

    draw();
  }
}

/* "Get Your Video" page: Find My Order.
   The customer types their order number and private code, then taps Find My Order.
   No list of order numbers is shown, so nobody sees other people's orders. */
{
  const g = document.querySelector('.getbox');
  if (g) {
    const $ = s => g.querySelector(s);
    const out = $('.result'), form = g.querySelector('form');
    const norm = v => { v = v.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v.startsWith('FN')) v = v.slice(2); return v ? 'FN-' + v : ''; };
    const num = () => $('#gOrder').value.replace(/\D/g, '');
    // a Stripe receipt number (like 1104-3271) typed in the order box gets a friendly explanation
    const isReceipt = () => /\d{3,}\s*-\s*\d/.test($('#gOrder').value);
    const check = () => {
      const r = isReceipt(), note = $('.rcptnote');
      if (note) note.hidden = !r;
      $('.findbtn').disabled = r || !(num().length >= 4 && num().length <= 8 && norm($('#gCode').value).length >= 9);
    };
    // the Sent screen links here with ?n=1001, so the order number fills itself in
    const pre = new URLSearchParams(location.search).get('n');
    if (pre && /^\d{4,8}$/.test(pre)) $('#gOrder').value = pre;
    $('#gOrder').addEventListener('input', check);
    $('#gCode').addEventListener('input', check);
    check();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const n = num(), code = norm($('#gCode').value);
      if (!SEND_URL || isReceipt() || n.length < 4 || n.length > 8 || code.length < 9) return;
      out.textContent = 'Finding your order…';
      try {
        const d = await (await fetch(SEND_URL + '?n=' + encodeURIComponent(n) + '&code=' + encodeURIComponent(code))).json();
        if (d.status === 'ready') {
          const vids = d.videos && d.videos.length ? d.videos : [{ name: 'Video', url: d.url }];
          const many = vids.length > 1 || d.waiting > 0 || d.left > 0;
          out.innerHTML = '<p>Order #' + n + ' is ready.</p>' +
            vids.map(v => '<a class="sbtn hl" href="' + v.url + '">Download ' + (many ? 'Your ' + v.name : 'Your Video') + '</a>').join('') +
            (d.waiting > 0 ? `<p>${d.waiting} more video${d.waiting === 1 ? ' is' : 's are'} on the way.</p>` : '') +
            '<button type="button" class="sbtn hl" id="gDone">Delete My Files</button>';
          $('#gDone').addEventListener('click', async () => {
            let r = {};
            try { r = await (await fetch(SEND_URL + '?n=' + encodeURIComponent(n) + '&code=' + encodeURIComponent(code) + '&done=1')).json(); } catch (err) {}
            out.innerHTML = r.left > 0
              ? `<p>Your downloaded videos and their images have been deleted. You still have ${r.left} video${r.left === 1 ? '' : 's'} to send with your receipt number.</p>`
              : '<p>All done. Your images and video have been deleted. Thank you!</p>';
          });
        } else if (d.status === 'waiting') {
          out.textContent = 'Order #' + n + ' is not ready yet. Your video is on its way, so please check back soon.';
        } else {
          out.textContent = 'We could not find that order. Please check your order number and private code, and try again.';
        }
      } catch (err) { out.textContent = 'Something went wrong. Please check your internet connection and try again.'; }
    });
  }
}

/* Thank-you page: Stripe sends the buyer here with ?session_id=cs_…
   The helper checks the payment with Stripe and shows: Payment accepted, the Stripe receipt number and the order number.
   Stripe gives the receipt number once it has emailed the receipt, so the page checks again for up to a minute. */
{
  const card = document.getElementById('packCard');
  const sid = new URLSearchParams(location.search).get('session_id');
  if (card && SEND_URL && sid && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sid)) {
    card.hidden = false;
    const $id = i => document.getElementById(i);
    const sb = document.querySelector('.sendbox:not(.getbox)');
    let tries = 0, filled = false;
    const ask = async () => {
      try {
        const d = await (await fetch(SEND_URL + '?pay=' + encodeURIComponent(sid))).json();
        if (!d.ok) throw new Error('not paid');
        $id('payHead').textContent = 'Payment accepted ✓';
        $id('payNum').textContent = '#' + d.number;
        $id('payRow').hidden = false;
        if (d.receipt) {
          $id('payReceipt').textContent = '#' + d.receipt; $id('payWait').hidden = true;
          if (sb && sb.fillPack) sb.fillPack(d.receipt, sid);
          try { localStorage.setItem('fionah-receipt', d.receipt); } catch (e) {}
          return;
        }
        $id('payReceipt').textContent = '…';
        if (!filled && sb && sb.fillPack) { sb.fillPack('', sid); filled = true; }   // they can send photos already
        if (++tries < 15) setTimeout(ask, 4000);
        else { $id('payWait').textContent = 'Your receipt number is in the receipt email from Stripe.'; $id('payWait').hidden = false; }
      } catch (err) {
        if (++tries < 4) return setTimeout(ask, 3000);
        $id('payHead').innerHTML = 'We could not confirm your payment yet. <a href="#" id="packTry">Try Again</a>';
        $id('payWait').innerHTML = 'Still not working? Email <a class="mail" href="mailto:accounts@fionah.com">accounts@fionah.com</a> with your receipt.';
        $id('payWait').hidden = false;
        $id('packTry').onclick = e => { e.preventDefault(); tries = 0; $id('payHead').textContent = 'Checking your payment…'; ask(); };
      }
    };
    ask();
  }
}
