import React, { useRef } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle, Animated } from 'react-native';
import { theme } from '../../theme';
import { ANIMATION_DURATIONS } from '../../utils/animations';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!isDisabled) {
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: ANIMATION_DURATIONS.FAST,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: ANIMATION_DURATIONS.FAST,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!isDisabled) {
      onPress();
    }
  };

  const variantStyle =
    variant === 'secondary'
      ? styles.secondary
      : variant === 'ghost'
      ? styles.ghost
      : styles.primary;

  const textVariantStyle =
    variant === 'secondary' || variant === 'ghost' ? styles.textDark : styles.textLight;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={1}
        style={[styles.base, variantStyle, isDisabled && styles.disabled, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? theme.colors.white : theme.colors.primary[500]} />
        ) : (
          <Text style={[styles.textBase, textVariantStyle, textStyle]}>{title}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radii.md,
  },
  primary: {
    backgroundColor: theme.colors.primary[500],
  },
  secondary: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary[200] ?? theme.colors.primary[50],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.6,
  },
  textBase: {
    fontSize: 16,
    fontWeight: '600',
  },
  textLight: {
    color: theme.colors.white,
  },
  textDark: {
    color: theme.colors.primary[500],
  },
});


