import { Dimensions, ScaledSize } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Screen dimensions
 */
export const SCREEN_DIMENSIONS = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};

/**
 * Breakpoints for responsive design
 */
export const BREAKPOINTS = {
  small: 375, // iPhone SE, small Android phones
  medium: 414, // iPhone 11 Pro Max, standard Android phones
  large: 768, // iPad, tablets
};

/**
 * Check if screen is small
 */
export function isSmallScreen(): boolean {
  return SCREEN_WIDTH < BREAKPOINTS.medium;
}

/**
 * Check if screen is medium
 */
export function isMediumScreen(): boolean {
  return SCREEN_WIDTH >= BREAKPOINTS.medium && SCREEN_WIDTH < BREAKPOINTS.large;
}

/**
 * Check if screen is large (tablet)
 */
export function isLargeScreen(): boolean {
  return SCREEN_WIDTH >= BREAKPOINTS.large;
}

/**
 * Get responsive value based on screen size
 */
export function getResponsiveValue<T>(values: {
  small?: T;
  medium?: T;
  large?: T;
  default: T;
}): T {
  if (isSmallScreen() && values.small !== undefined) {
    return values.small;
  }
  if (isMediumScreen() && values.medium !== undefined) {
    return values.medium;
  }
  if (isLargeScreen() && values.large !== undefined) {
    return values.large;
  }
  return values.default;
}

/**
 * Get responsive font size
 */
export function getResponsiveFontSize(baseSize: number): number {
  if (isSmallScreen()) {
    return baseSize * 0.9;
  }
  if (isLargeScreen()) {
    return baseSize * 1.1;
  }
  return baseSize;
}

/**
 * Get responsive spacing
 */
export function getResponsiveSpacing(baseSpacing: number): number {
  if (isSmallScreen()) {
    return Math.max(4, baseSpacing * 0.85);
  }
  if (isLargeScreen()) {
    return baseSpacing * 1.15;
  }
  return baseSpacing;
}

/**
 * Listen to dimension changes
 */
export function onDimensionsChange(callback: (dimensions: ScaledSize) => void) {
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    callback(window);
  });
  return () => subscription?.remove();
}
