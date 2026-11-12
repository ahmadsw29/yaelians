import { Platform } from 'react-native';

/** Native Apple fonts on iOS/macOS, with Arabic-capable system fallbacks.
 * Do not download or redistribute Apple's proprietary font files. Weights are
 * selected with fontWeight, not a Latin-only custom face. */
export const ARABIC_FONT = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Arabic", "SF Pro Text", "Segoe UI", Tahoma, Arial, sans-serif',
  ios: 'System',
  default: 'sans-serif',
});
export const ARABIC_BOLD_FONT = ARABIC_FONT;
