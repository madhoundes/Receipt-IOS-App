import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { OcrResult } from '../types';
import { parseReceiptText, extractItemNames, mergeItems } from '../utils/receiptParser';
import { readText, type Layout } from './ocrEngine';

export type { OcrResult };

/** Turns a receipt photo into structured data. The app only depends on this interface. */
export interface OcrService {
  /** `onStage` is told when the text has been read and the fields are being picked out. */
  scanReceipt(imageUri: string, onStage?: (stage: 'reading' | 'rereading' | 'matching') => void): Promise<OcrResult>;
}

/** `not-receipt`: the photo shows no receipt. `unreachable`: the text reader could not start (it needs the internet the first time). `failed`: anything else. */
export class OcrError extends Error {
  constructor(public code: 'not-receipt' | 'unreachable' | 'failed') { super(code); }
}

const readBase64 = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(',')[1] ?? '');
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
};

/** Reads the text on the device (no account, no server, no AI), then picks out the receipt fields with plain rules. */
/** A read is good enough to keep when the receipt's own numbers were found and agree. */
const GOOD_ENOUGH = 0.75;

const read = async (base64: string, layout: Layout): Promise<string> => {
  try {
    return await readText(base64, layout);
  } catch (e: any) {
    throw new OcrError(e?.name === 'EngineUnavailable' || e?.constructor?.name === 'EngineUnavailable' ? 'unreachable' : 'failed');
  }
};

/** A card with its last four digits beats a bare method name. */
const betterPayment = (a?: string, b?: string) => (/\d{4}/.test(b ?? '') && !/\d{4}/.test(a ?? '') ? b : a ?? b);

/**
 * Reads the text on the device (no account, no server, no AI), then picks out the receipt fields with plain rules.
 *
 * The photo is read twice: once as one tidy column, which is the most accurate on a flat receipt, and once as a single
 * block of text, which keeps the price column on a tilted or crumpled photo. The totals come from the stronger read.
 * The item names and the payment method are taken from both, so a name garbled in one read is fixed by the other.
 */
export const ocr: OcrService = {
  async scanReceipt(imageUri, onStage) {
    onStage?.('reading');
    const base64 = await readBase64(imageUri).catch(() => { throw new OcrError('failed'); });
    const first = await read(base64, '4');
    const a = parseReceiptText(first);
    onStage?.('rereading');
    // A second read that fails must not throw away a usable first read.
    const second = await read(base64, '6').catch(e => { if (a) return ''; throw e; });
    const b = second ? parseReceiptText(second) : null;
    onStage?.('matching');
    let best = b && (!a || b.confidence > a.confidence) ? b : a;
    // Text was clearly read but no total was found: keep what there is, the user adds the total.
    const opts = { allowNoTotal: true };
    const pa = a ?? parseReceiptText(first, new Date(), opts), pb = b ?? (second ? parseReceiptText(second, new Date(), opts) : null);
    best = best ?? (pb && second.length > first.length ? pb : pa ?? pb);
    if (!best) throw new OcrError('not-receipt');
    const lead = best === b || best === pb;
    const readA = { names: extractItemNames(first), items: pa?.items ?? [] };
    const readB = { names: second ? extractItemNames(second) : [], items: pb?.items ?? [] };
    const items = lead ? mergeItems(readB, readA) : mergeItems(readA, readB);
    const paymentMethod = lead ? betterPayment(pb?.paymentMethod, pa?.paymentMethod) : betterPayment(pa?.paymentMethod, pb?.paymentMethod);
    return { ...best, items, paymentMethod };
  },
};
