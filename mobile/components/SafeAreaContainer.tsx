import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeAreaContainerProps {
  children: ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
}

/**
 * Container component that applies safe area padding
 * Use this to wrap content that needs to respect safe areas
 */
export function SafeAreaContainer({
  children,
  style,
  edges = ['top', 'bottom', 'left', 'right'],
  backgroundColor,
}: SafeAreaContainerProps) {
  const insets = useSafeAreaInsets();

  const paddingStyle: ViewStyle = {};
  
  if (edges.includes('top')) {
    paddingStyle.paddingTop = insets.top;
  }
  if (edges.includes('bottom')) {
    paddingStyle.paddingBottom = insets.bottom;
  }
  if (edges.includes('left')) {
    paddingStyle.paddingLeft = insets.left;
  }
  if (edges.includes('right')) {
    paddingStyle.paddingRight = insets.right;
  }

  return (
    <View
      style={[
        styles.container,
        paddingStyle,
        backgroundColor && { backgroundColor },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
