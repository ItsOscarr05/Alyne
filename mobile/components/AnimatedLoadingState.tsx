import React, { useRef, useEffect } from 'react';
import { Animated, View, ActivityIndicator, Text, ViewStyle, TextStyle } from 'react-native';
import { ANIMATION_DURATIONS, ANIMATION_EASING } from '../utils/animations';

interface AnimatedLoadingStateProps {
  visible: boolean;
  message?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Animated loading state component with fade in/out
 */
export function AnimatedLoadingState({ 
  visible, 
  message = 'Loading...', 
  style,
  textStyle 
}: AnimatedLoadingStateProps) {
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 1 : 0,
      duration: ANIMATION_DURATIONS.FAST,
      easing: ANIMATION_EASING.easeInOut,
      useNativeDriver: true,
    }).start();
  }, [visible, opacityAnim]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[{ opacity: opacityAnim }, style]}>
      <ActivityIndicator size="large" color="#2563eb" />
      {message && <Text style={textStyle}>{message}</Text>}
    </Animated.View>
  );
}

