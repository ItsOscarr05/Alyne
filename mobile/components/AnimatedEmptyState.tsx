import React, { useRef, useEffect } from 'react';
import { Animated, View, ViewStyle } from 'react-native';
import { ANIMATION_DURATIONS, ANIMATION_EASING } from '../utils/animations';

interface AnimatedEmptyStateProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Wrapper component for empty states with fade + scale animation
 */
export function AnimatedEmptyState({ children, style }: AnimatedEmptyStateProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATIONS.SLOW,
        easing: ANIMATION_EASING.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: ANIMATION_DURATIONS.SLOW,
        easing: ANIMATION_EASING.easeOut,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

