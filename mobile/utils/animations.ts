import { Easing } from 'react-native';

/**
 * Animation duration constants
 */
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 300,
};

/**
 * Animation easing presets
 */
export const ANIMATION_EASING = {
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  easeIn: Easing.in(Easing.ease),
};

/**
 * Spring animation presets
 */
export const SPRING_CONFIG = {
  default: {
    tension: 50,
    friction: 7,
  },
  bouncy: {
    tension: 60,
    friction: 5,
  },
  gentle: {
    tension: 40,
    friction: 8,
  },
};

