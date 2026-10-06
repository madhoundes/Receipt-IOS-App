/**
 * Bridge between the scanner and the hidden page that reads text (see OcrHost). The host registers how to talk to the page;
 * the scanner calls `readText(base64Jpeg)` and gets the plain text of the receipt back.
 *
 * A scan is sent to the page straight away. The page is only reloaded when there is a clear sign it is gone:
 * the system reports that it stopped it, or it stays completely silent for a long time. Then the scan is sent once more.
 * A read never waits forever: it ends with the text or with an error the screen can show.
 */
type Pending = {
  resolve: (t: string) => void; reject: (e: Error) => void;
  quiet: ReturnType<typeof setTimeout>; total: ReturnType<typeof setTimeout>;
};

export class EngineUnavailable extends Error { name = 'EngineUnavailable'; }
/** The page did not answer. The scan can be tried again after a reload. */
class Stalled extends Error { name = 'Stalled'; }

/** With no sign of life from the page for this long, it is treated as gone. Longer than a normal read. */
const QUIET_MS = 25000;
/** Longest a single read may take. */
const READ_MS = 75000;
/** Longest to wait for the page to come back after a reload. */
const RELOAD_MS = 20000;

let sender: ((id: number, base64: string) => void) | undefined;
let reload: (() => void) | undefined;
let loadFailed = false;
/** True while a reloaded page has not reported back yet. A scan sent then would be lost. */
let reloading = false;
let seq = 0;
const pending = new Map<number, Pending>();
let aliveWaiters: ((ok: boolean) => void)[] = [];

const settleAlive = (ok: boolean) => {
  const list = aliveWaiters;
  aliveWaiters = [];
  list.forEach(w => w(ok));
};

const clear = (p: Pending) => { clearTimeout(p.quiet); clearTimeout(p.total); };
const failAll = (make: () => Error) => {
  pending.forEach(p => { clear(p); p.reject(make()); });
  pending.clear();
};

const restart = () => { if (!reload) return; reloading = true; reload(); };
const pageIsAlive = () => { loadFailed = false; reloading = false; settleAlive(true); };

export const engineHost = {
  attach(send: (id: number, base64: string) => void, reloadPage: () => void) { sender = send; reload = reloadPage; loadFailed = false; reloading = false; },
  detach() { sender = undefined; reload = undefined; reloading = false; failAll(() => new EngineUnavailable()); settleAlive(false); },
  /** A message from the page. */
  message(raw: string) {
    let m: any;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'loadError') {
      loadFailed = true; reloading = false;
      failAll(() => new EngineUnavailable());
      settleAlive(false);
    } else if (m.type === 'crashed') {
      // The system stopped the page. Load it again; scans in flight are sent again by readText.
      failAll(() => new Stalled());
      restart();
    } else if (m.type === 'loaded' || m.type === 'ready') {
      pageIsAlive();
    } else if (m.type === 'started') {
      pageIsAlive();
      const p = pending.get(m.id);
      if (p) clearTimeout(p.quiet);
    } else if (m.type === 'result' || m.type === 'error') {
      pageIsAlive();
      const p = pending.get(m.id);
      if (!p) return;
      clear(p); pending.delete(m.id);
      if (m.type === 'result') p.resolve(String(m.text ?? '')); else p.reject(new Error(m.message));
    }
  },
};

/** Only waits when a reload is in progress. A fresh page takes scans right away and queues them itself. */
const whenAlive = (): Promise<void> => {
  if (loadFailed) { loadFailed = false; restart(); }
  if (!reloading) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const waiter = (ok: boolean) => { clearTimeout(timer); ok ? resolve() : reject(new EngineUnavailable()); };
    const timer = setTimeout(() => {
      aliveWaiters = aliveWaiters.filter(w => w !== waiter);
      // No word from the reloaded page. Try sending anyway rather than giving up here.
      reloading = false;
      resolve();
    }, RELOAD_MS);
    aliveWaiters.push(waiter);
  });
};

const readOnce = async (base64: string): Promise<string> => {
  await whenAlive();
  if (!sender) throw new EngineUnavailable();
  const id = ++seq;
  return new Promise<string>((resolve, reject) => {
    const drop = (e: Error) => { const p = pending.get(id); if (!p) return; clear(p); pending.delete(id); reject(e); };
    const quiet = setTimeout(() => drop(new Stalled()), QUIET_MS);
    const total = setTimeout(() => drop(new Error('timeout')), READ_MS);
    pending.set(id, { resolve, reject, quiet, total });
    sender!(id, base64);
  });
};

export async function readText(base64: string): Promise<string> {
  if (!sender) throw new EngineUnavailable();
  try {
    return await readOnce(base64);
  } catch (e) {
    if (!(e instanceof Stalled)) throw e;
    // The page went quiet or was stopped: start it again and try once more.
    restart();
    try {
      return await readOnce(base64);
    } catch (e2) {
      if (e2 instanceof Stalled) throw new Error('timeout');
      throw e2;
    }
  }
}
