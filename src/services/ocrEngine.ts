/**
 * Bridge between the scanner and the hidden page that reads text (see OcrHost). The host registers how to talk to the page;
 * the scanner calls `readText(base64Jpeg)` and gets the plain text of the receipt back.
 *
 * The page can die without telling anyone (iOS stops a web page that uses too much memory), so every scan is watched:
 * the page must confirm it received the photo within a few seconds. If it does not, the page is reloaded and the scan
 * is sent one more time. Nothing waits forever.
 */
type Pending = {
  resolve: (t: string) => void; reject: (e: Error) => void;
  ack: ReturnType<typeof setTimeout>; total: ReturnType<typeof setTimeout>;
};

export class EngineUnavailable extends Error { name = 'EngineUnavailable'; }
/** The page did not answer. The scan can be tried again after a reload. */
class Stalled extends Error { name = 'Stalled'; }

/** How long the page has to confirm that it received the photo. */
const ACK_MS = 6000;
/** Longest a single read may take. */
const READ_MS = 60000;
/** Longest to wait for the reader to load (the first run downloads it). */
const READY_MS = 40000;

let sender: ((id: number, base64: string) => void) | undefined;
let reload: (() => void) | undefined;
let loadFailed = false;
let ready = false;
let seq = 0;
const pending = new Map<number, Pending>();
let readyWaiters: ((ok: boolean) => void)[] = [];

const settleReady = (ok: boolean) => {
  const list = readyWaiters;
  readyWaiters = [];
  list.forEach(w => w(ok));
};

const failAll = (make: () => Error) => {
  pending.forEach(p => { clearTimeout(p.ack); clearTimeout(p.total); p.reject(make()); });
  pending.clear();
};

const restart = () => { ready = false; reload?.(); };

export const engineHost = {
  attach(send: (id: number, base64: string) => void, reloadPage: () => void) { sender = send; reload = reloadPage; loadFailed = false; ready = false; },
  detach() { sender = undefined; reload = undefined; ready = false; failAll(() => new EngineUnavailable()); settleReady(false); },
  /** A message from the page. */
  message(raw: string) {
    let m: any;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'loadError') {
      loadFailed = true; ready = false;
      failAll(() => new EngineUnavailable());
      settleReady(false);
    } else if (m.type === 'crashed') {
      // The system stopped the page. Load it again; scans in flight are sent again by readText.
      failAll(() => new Stalled());
      restart();
    } else if (m.type === 'ready') {
      loadFailed = false; ready = true;
      settleReady(true);
    } else if (m.type === 'started') {
      ready = true;
      const p = pending.get(m.id);
      if (p) clearTimeout(p.ack);
    } else if (m.type === 'result' || m.type === 'error') {
      const p = pending.get(m.id);
      if (!p) return;
      clearTimeout(p.ack); clearTimeout(p.total); pending.delete(m.id);
      if (m.type === 'result') p.resolve(String(m.text ?? '')); else p.reject(new Error(m.message));
    }
  },
};

const whenReady = (): Promise<void> => {
  if (ready) return Promise.resolve();
  if (loadFailed) { loadFailed = false; restart(); }
  return new Promise<void>((resolve, reject) => {
    const waiter = (ok: boolean) => { clearTimeout(timer); ok ? resolve() : reject(new EngineUnavailable()); };
    const timer = setTimeout(() => {
      readyWaiters = readyWaiters.filter(w => w !== waiter);
      reject(new EngineUnavailable());
    }, READY_MS);
    readyWaiters.push(waiter);
  });
};

const readOnce = async (base64: string): Promise<string> => {
  await whenReady();
  if (!sender) throw new EngineUnavailable();
  const id = ++seq;
  return new Promise<string>((resolve, reject) => {
    const drop = (e: Error) => { const p = pending.get(id); if (!p) return; clearTimeout(p.ack); clearTimeout(p.total); pending.delete(id); reject(e); };
    const ack = setTimeout(() => drop(new Stalled()), ACK_MS);
    const total = setTimeout(() => drop(new Stalled()), READ_MS);
    pending.set(id, { resolve, reject, ack, total });
    sender!(id, base64);
  });
};

export async function readText(base64: string): Promise<string> {
  if (!sender) throw new EngineUnavailable();
  try {
    return await readOnce(base64);
  } catch (e) {
    if (!(e instanceof Stalled)) throw e;
    // The page went quiet: start it again and try once more.
    restart();
    try {
      return await readOnce(base64);
    } catch (e2) {
      if (e2 instanceof Stalled) { restart(); throw new Error('timeout'); }
      throw e2;
    }
  }
}
