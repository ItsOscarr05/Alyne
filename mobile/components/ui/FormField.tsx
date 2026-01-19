import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { ANIMATION_DURATIONS, ANIMATION_EASING } from '../../utils/animations';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, style, secureTextEntry, required, ...inputProps }) => {
  const { theme: themeHook } = useTheme();
  const hasError = Boolean(error);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPasswordField = secureTextEntry;
  const borderWidthAnim = useRef(new Animated.Value(2)).current; // Start with 2px for better visibility

  // Animate border on focus/blur
  useEffect(() => {
    if (hasError) {
      borderWidthAnim.setValue(2); // Keep error border at 2px
      return;
    }

    Animated.timing(borderWidthAnim, {
      toValue: isFocused ? 2.5 : 2, // Always visible: 2px unfocused, 2.5px focused
      duration: ANIMATION_DURATIONS.FAST,
      easing: ANIMATION_EASING.easeInOut,
      useNativeDriver: false, // borderWidth can't use native driver
    }).start();
  }, [isFocused, hasError, borderWidthAnim]);

  // Reset animations when error changes
  useEffect(() => {
    if (hasError) {
      borderWidthAnim.setValue(2); // Error border at 2px
    }
  }, [hasError, borderWidthAnim]);

  const borderColor = hasError 
    ? themeHook.colors.error 
    : isFocused 
    ? themeHook.colors.primary 
    : themeHook.colors.border;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: themeHook.colors.text }]}>
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
            { 
              backgroundColor: themeHook.colors.surface,
              color: themeHook.colors.text,
            },
            !hasError && { borderWidth: 0 }, // Remove default border when no error (animated border handles it)
            hasError && styles.inputError,
            isPasswordField && styles.inputWithIcon,
            style
          ]}
          placeholderTextColor={themeHook.colors.textTertiary}
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
              color={themeHook.colors.textTertiary}
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
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 16,
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


