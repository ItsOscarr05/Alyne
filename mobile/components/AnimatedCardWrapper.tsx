import React, { useRef, useEffect } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { ANIMATION_DURATIONS, ANIMATION_EASING } from '../utils/animations';

interface AnimatedCardWrapperProps {
  children: React.ReactNode;
  index: number;
  style?: ViewStyle;
}

/**
 * Wrapper component for animating cards in a list with stagger effect
 */
export function AnimatedCardWrapper({ children, index, style }: AnimatedCardWrapperProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Stagger delay: 50ms per item
    const delay = index * 50;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATIONS.SLOW,
        delay,
        easing: ANIMATION_EASING.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: ANIMATION_DURATIONS.SLOW,
        delay,
        easing: ANIMATION_EASING.easeOut,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateYAnim, index]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: translateYAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

