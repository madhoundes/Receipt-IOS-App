import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { OcrResult } from '../types';
import { parseReceiptText } from '../utils/receiptParser';
import { readText } from './ocrEngine';

export type { OcrResult };

/** Turns a receipt photo into structured data. The app only depends on this interface. */
export interface OcrService {
  /** `onStage` is told when the text has been read and the fields are being picked out. */
  scanReceipt(imageUri: string, onStage?: (stage: 'reading' | 'matching') => void): Promise<OcrResult>;
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
export const ocr: OcrService = {
  async scanReceipt(imageUri, onStage) {
    let text: string;
    onStage?.('reading');
    try {
      text = await readText(await readBase64(imageUri));
    } catch (e: any) {
      throw new OcrError(e?.name === 'EngineUnavailable' || e?.constructor?.name === 'EngineUnavailable' ? 'unreachable' : 'failed');
    }
    onStage?.('matching');
    const result = parseReceiptText(text);
    if (!result) throw new OcrError('not-receipt');
    return result;
  },
};
