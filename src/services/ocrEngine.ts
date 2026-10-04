/**
 * Bridge between the scanner and the hidden page that reads text (see OcrHost). The host registers how to talk to the page;
 * the scanner calls `readText(base64Jpeg)` and gets the plain text of the receipt back.
 */
type Pending = { resolve: (t: string) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

export class EngineUnavailable extends Error { name = 'EngineUnavailable'; }

let sender: ((id: number, base64: string) => void) | undefined;
let reload: (() => void) | undefined;
let loadFailed = false;
let seq = 0;
const pending = new Map<number, Pending>();

export const engineHost = {
  attach(send: (id: number, base64: string) => void, reloadPage: () => void) { sender = send; reload = reloadPage; loadFailed = false; },
  detach() { sender = undefined; reload = undefined; },
  /** A message from the page. */
  message(raw: string) {
    let m: any;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'loadError') {
      loadFailed = true;
      pending.forEach(p => { clearTimeout(p.timer); p.reject(new EngineUnavailable()); });
      pending.clear();
    } else if (m.type === 'ready') {
      loadFailed = false;
    } else if (m.type === 'result' || m.type === 'error') {
      const p = pending.get(m.id);
      if (!p) return;
      clearTimeout(p.timer); pending.delete(m.id);
      if (m.type === 'result') p.resolve(String(m.text ?? '')); else p.reject(new Error(m.message));
    }
  },
};

export function readText(base64: string): Promise<string> {
  if (!sender) return Promise.reject(new EngineUnavailable());
  if (loadFailed) { loadFailed = false; reload?.(); return Promise.reject(new EngineUnavailable()); }
  const id = ++seq;
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('timeout')); }, 120000);
    pending.set(id, { resolve, reject, timer });
    sender!(id, base64);
  });
}
