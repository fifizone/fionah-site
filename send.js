/* fionah — "Send your photos" box
   ============ EDIT ME ============
   Paste the Google Apps Script web-app link between the quotes to switch sending on.
   Leave it empty and the Send button stays off ("Sending opens soon").            */
const SEND_URL = "";
/* ================================= */
{
  const box = document.querySelector('.sendbox');
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
      const ready = $('#sbName').value.trim() && okEmail($('#sbEmail').value.trim()) && photos.length && pick.len;
      $('.send').disabled = !SEND_URL || !ready;
      $('.note').textContent = !SEND_URL ? 'Sending opens soon.'
        : ready ? 'Ready to send.' : 'Add your name, email, video length and at least one photo.';
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
      const order = { id: Date.now().toString(36), name: $('#sbName').value.trim(), email: $('#sbEmail').value.trim(),
                      address: $('#sbAddr').value.trim(), notes: $('#sbNotes').value.trim(), length: pick.len, music: pick.music };
      $('.send').disabled = true; $('.prog').style.display = 'block';
      try {
        for (let i = 0; i < photos.length; i++) {
          $('.note').textContent = `Sending photo ${i + 1} of ${photos.length}…`;
          const data = await shrink(photos[i].file);
          await fetch(SEND_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ ...order, index: i + 1, total: photos.length, data }) });
          $('.prog i').style.width = Math.round((i + 1) / photos.length * 100) + '%';
        }
        $('.done p').textContent = `Thanks, ${order.name}! Your ${photos.length} photos are with us. We've emailed ${order.email} to say they arrived, and your video will come to the same address.`;
        box.classList.add('is-done');
      } catch (err) {
        $('.note').textContent = 'Something went wrong. Please check your internet and tap Send again.';
        $('.send').disabled = false;
      }
    });

    draw();
  }
}
