import { useColorScheme } from 'react-native';
import { useReceipts } from './ReceiptContext';
import { Scheme, setScheme } from '../theme';

/**
 * Resolves Light or Dark from the Appearance setting and the device, and applies it to the theme.
 * Call it once, above everything that reads `colors`; remount that tree with `key={scheme}`.
 */
export function useAppScheme(): Scheme {
  const device = useColorScheme();
  const { userProfile } = useReceipts();
  const pref = userProfile.appearance ?? 'system';
  const scheme: Scheme = pref === 'system' ? (device === 'dark' ? 'dark' : 'light') : pref;
  setScheme(scheme);
  return scheme;
}
