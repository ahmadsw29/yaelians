import { Platform } from 'react-native';

/**
 * System Arabic typography. Apple browsers resolve -apple-system to SF Arabic;
 * iOS 'System' is SF Arabic natively. Other platforms use their own OS Arabic
 * face (e.g. Noto / Segoe). No proprietary font files are bundled.
 */
const WEB_SYSTEM_STACK = '-apple-system, BlinkMacSystemFont, "SF Arabic", "SF Pro Text", system-ui, "Segoe UI", "Noto Sans Arabic", "Noto Sans Hebrew", sans-serif';

export const ARABIC_FONT = Platform.select({ web: WEB_SYSTEM_STACK, ios: 'System', default: 'sans-serif' });
export const ARABIC_BOLD_FONT = Platform.select({ web: WEB_SYSTEM_STACK, ios: 'System', default: 'sans-serif' });
export const ARABIC_WEIGHT = { regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' } as const;
