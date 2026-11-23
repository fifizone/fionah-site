/* fionah safety guard — keeps sexual, violent and cruel pictures and words out.
   Guard 1: checks each photo ON THE CUSTOMER'S PHONE before it can be used or sent
            (free open-source checker "NSFWJS"; the photo never leaves the phone for this check).
   Guard 3: checks the words typed in the boxes.
   Used by the Send photos page (send.js) and the Motion Studio app.
   No computer checker is perfect — Fi's own look at each order is still the last guard. */
(() => {
  const here = (document.currentScript && document.currentScript.src) || location.href;
  const BASE = here.replace(/[^\/]*$/, '');            // folder this file lives in (…/safety/)

  // ============ EDIT ME: how strict the photo guard is (0 = never, 1 = certain) ============
  const LIMITS = { Porn: 0.6, Hentai: 0.6, Sexy: 0.9 };   // block if the checker is this sure or more
  // ===========================================================================================

  // ---- Guard 3: words that are not accepted (whole words only, so "Middlesex" or "Essex" are fine) ----
  const WORDS = [
    'sex', 'porn', 'porno', 'pornography', 'xxx', 'nude', 'nudes', 'naked', 'nsfw', 'fuck', 'fucking', 'fucker',
    'cunt', 'cock', 'pussy', 'penis', 'vagina', 'boobs', 'tits', 'blowjob', 'cum', 'orgasm', 'horny', 'slut', 'whore',
    'rape', 'raped', 'rapist', 'molest', 'pedo', 'paedo', 'pedophile', 'paedophile', 'bestiality', 'zoophilia',
    'kill', 'murder', 'torture', 'behead', 'gore', 'massacre', 'mutilate', 'cruelty', 'abuse',
    // swearing, insults and slurs (derogatory words)
    'shit', 'bullshit', 'motherfucker', 'bitch', 'bastard', 'asshole', 'arsehole', 'dickhead', 'wanker', 'retard', 'nigger', 'nigga', 'faggot', 'fag', 'tranny', 'chink', 'gook', 'kike', 'wog', 'coon', 'abo', 'paki', 'spic'
  ];
  const norm = s => String(s || '').toLowerCase()
    .replace(/[0@4]/g, m => ({ '0': 'o', '@': 'a', '4': 'a' })[m])
    .replace(/[1!]/g, 'i').replace(/3/g, 'e').replace(/[5$]/g, 's');
  const RX = new RegExp('\\b(' + WORDS.join('|') + ')\\b', 'i');
  function checkWords(text) {
    const t = norm(text);
    const joined = t.replace(/\b(\w)[\s.\-_*]+(?=\w\b)/g, '$1');   // "f u c k" → "fuck"
    return { ok: !(RX.test(t) || RX.test(joined)) };
  }

  // ---- Guard 1: photo checker (loads once, only when the first photo is added) ----
  let ready = null;
  const loadScript = src => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  function load() {
    if (!ready) ready = (async () => {
      if (!window.nsfwjs) await loadScript(BASE + 'nsfwjs.min.js');
      return window.nsfwjs.load(BASE + 'model/', { size: 224 });
    })().catch(err => { ready = null; throw err; });
    return ready;
  }

  /* checkPhoto(img or canvas) → { ok: true } or { ok: false }
     If the checker cannot run (very old phone, no internet), the photo is let through here
     and checked again by Google's guard when it is sent (Guard 2). */
  async function checkPhoto(el) {
    try {
      const model = await load();
      const preds = await model.classify(el, 5);
      const bad = preds.some(p => LIMITS[p.className] != null && p.probability >= LIMITS[p.className]);
      return { ok: !bad, checked: true };
    } catch (err) {
      console.warn('fionah safety: photo checker could not run', err);
      return { ok: true, checked: false };
    }
  }

  // turn a File into an <img> the checker can read
  function fileToImg(file) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = e => { URL.revokeObjectURL(url); rej(e); };
      img.src = url;
    });
  }

  window.fionahSafety = {
    checkWords, checkPhoto, load,
    checkFile: async f => { try { return await checkPhoto(await fileToImg(f)); } catch (e) { return { ok: true, checked: false }; } }
  };
})();
