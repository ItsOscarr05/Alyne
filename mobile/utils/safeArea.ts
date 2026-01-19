import { useSafeAreaInsets as useRNSafeAreaInsets } from 'react-native-safe-area-context';
import type { EdgeInsets } from 'react-native-safe-area-context';

/**
 * Hook to get safe area insets
 * Returns insets for top, bottom, left, and right safe areas
 */
export function useSafeAreaInsets(): EdgeInsets {
  return useRNSafeAreaInsets();
}

/**
 * Get safe area padding style object
 */
export function getSafeAreaPadding(insets: EdgeInsets) {
  return {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
}

/**
 * Get safe area margin style object
 */
export function getSafeAreaMargin(insets: EdgeInsets) {
  return {
    marginTop: insets.top,
    marginBottom: insets.bottom,
    marginLeft: insets.left,
    marginRight: insets.right,
  };
}
