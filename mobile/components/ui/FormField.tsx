import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ANIMATION_DURATIONS, ANIMATION_EASING } from '../../utils/animations';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, style, secureTextEntry, required, ...inputProps }) => {
  const hasError = Boolean(error);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPasswordField = secureTextEntry;
  const borderWidthAnim = useRef(new Animated.Value(1)).current;

  // Animate border on focus/blur
  useEffect(() => {
    if (hasError) return; // Don't animate if there's an error (error state takes priority)

    Animated.timing(borderWidthAnim, {
      toValue: isFocused ? 2 : 1,
      duration: ANIMATION_DURATIONS.FAST,
      easing: ANIMATION_EASING.easeInOut,
      useNativeDriver: false, // borderWidth can't use native driver
    }).start();
  }, [isFocused, hasError, borderWidthAnim]);

  // Reset animations when error changes
  useEffect(() => {
    if (hasError) {
      borderWidthAnim.setValue(1);
    }
  }, [hasError, borderWidthAnim]);

  const borderColor = hasError 
    ? theme.colors.semantic.error 
    : isFocused 
    ? theme.colors.primary[500] 
    : theme.colors.neutral[200];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.requiredAsterisk}> *</Text>}
      </Text>
      <View style={styles.inputContainer}>
        <Animated.View
          style={[
            styles.animatedBorder,
            {
              borderWidth: borderWidthAnim,
              borderColor,
            },
          ]}
          pointerEvents="none"
        />
        <TextInput
          style={[
            styles.input,
            !hasError && { borderWidth: 0 }, // Remove default border when no error (animated border handles it)
            hasError && styles.inputError,
            isPasswordField && styles.inputWithIcon,
            style
          ]}
          placeholderTextColor={theme.colors.neutral[500]}
          secureTextEntry={isPasswordField && !isPasswordVisible}
          onFocus={(e) => {
            setIsFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            inputProps.onBlur?.(e);
          }}
          {...inputProps}
        />
        {isPasswordField && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={theme.colors.neutral[500]}
            />
          </TouchableOpacity>
        )}
      </View>
      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.sm,
  },
  requiredAsterisk: {
    color: theme.colors.semantic.error,
  },
  inputContainer: {
    position: 'relative',
  },
  animatedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.radii.md,
    pointerEvents: 'none',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 16,
    backgroundColor: theme.colors.white,
    color: theme.colors.neutral[900],
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  inputWithIcon: {
    paddingRight: 50,
  },
  inputError: {
    borderColor: theme.colors.semantic.error,
  },
  eyeIcon: {
    position: 'absolute',
    right: theme.spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xs,
  },
  errorText: {
    marginTop: theme.spacing.xs,
    fontSize: 12,
    color: theme.colors.semantic.error,
  },
});


