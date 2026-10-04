import React, { useEffect, useRef } from 'react';
import { engineHost } from '../services/ocrEngine';
import { ocrEngineHtml } from '../services/ocrEngineHtml';

/** Browser preview version of OcrHost: the same page, inside a hidden iframe. */
export function OcrHost() {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (typeof e.data === 'string' && e.source === ref.current?.contentWindow) engineHost.message(e.data); };
    window.addEventListener('message', onMsg);
    engineHost.attach(
      (id, image) => ref.current?.contentWindow?.postMessage(JSON.stringify({ type: 'scan', id, image }), '*'),
      () => { if (ref.current) ref.current.srcdoc = ocrEngineHtml; },
    );
    return () => { window.removeEventListener('message', onMsg); engineHost.detach(); };
  }, []);
  return <iframe ref={ref} srcDoc={ocrEngineHtml} title="receipt reader" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, border: 0 }} />;
}
