// The text reader runs inside a hidden web page (Tesseract.js, an open source reader that works on the device).
// The first run downloads the reader and its English language file once (the photo is never uploaded); after that the
// phone's web cache keeps them. Pinned versions, so the app behaves the same tomorrow as today.
export const TESSERACT_VERSION = '7.0.0';
export const LANG_PACK = '@tesseract.js-data/eng@1.0.0/4.0.0_best_int';

export const ocrEngineHtml = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<script>
  const send = m => {
    const s = JSON.stringify(m);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s); else parent.postMessage(s, '*');
  };
  window.__loadFailed = () => send({ type: 'loadError' });
</script>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js" onerror="__loadFailed()"></script>
<script>
  let workerPromise;
  const getWorker = () => workerPromise || (workerPromise = Tesseract.createWorker('eng', 1, {
    langPath: 'https://cdn.jsdelivr.net/npm/${LANG_PACK}',
  }).then(async w => {
    // One column of text, and keep the gap between an item and its price so the two stay on the same line.
    try { await w.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' }); } catch (_) { /* keep the defaults */ }
    return w;
  }));

  // Grayscale, stretch contrast and make sure the photo is wide enough for small receipt print.
  const prepare = b64 => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width < 1600 ? 1600 / img.width : 1;
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height);
      const px = d.data; let lo = 255, hi = 0;
      for (let i = 0; i < px.length; i += 4) {
        const v = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
        px[i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
      }
      const range = Math.max(1, hi - lo);
      for (let i = 0; i < px.length; i += 4) {
        const v = Math.max(0, Math.min(255, ((px[i] - lo) * 255) / range));
        px[i] = px[i + 1] = px[i + 2] = v;
      }
      g.putImageData(d, 0, 0);
      resolve(c);
    };
    img.onerror = () => reject(new Error('bad image'));
    img.src = 'data:image/jpeg;base64,' + b64;
  });

  async function scan(id, b64) {
    let canvas;
    // Tell the app the photo arrived, so it knows this page is alive.
    send({ type: 'started', id });
    try {
      if (typeof Tesseract === 'undefined') throw new Error('engine missing');
      const worker = await getWorker();
      canvas = await prepare(b64);
      const { data } = await worker.recognize(canvas);
      send({ type: 'result', id, text: data.text });
    } catch (e) {
      workerPromise = undefined;
      send({ type: 'error', id, message: String((e && e.message) || e) });
    } finally {
      // Give the picture memory back right away, so a second and third scan have room.
      if (canvas) { canvas.width = 0; canvas.height = 0; }
    }
  }
  window.__scan = (id, b64) => { scan(id, b64); true; };
  window.addEventListener('message', e => {
    try { const m = JSON.parse(e.data); if (m.type === 'scan') scan(m.id, m.image); } catch (_) {}
  });
  // Start downloading the reader right away so the first scan does not wait for it.
  if (typeof Tesseract !== 'undefined') getWorker().then(() => send({ type: 'ready' })).catch(() => send({ type: 'loadError' }));
</script></body></html>`;
