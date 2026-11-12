import { Platform } from 'react-native';

/** The same system Arabic face and strong weight used by the home headings. */
export const ARABIC_BOLD_FONT = Platform.select({
  web: 'Inter_700Bold',
  ios: 'System',
  default: 'sans-serif',
});
