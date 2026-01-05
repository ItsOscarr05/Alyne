import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, Animated } from 'react-native';
import { theme } from '../../theme';
import { ANIMATION_DURATIONS, ANIMATION_EASING } from '../../utils/animations';
import { useTheme } from '../../contexts/ThemeContext';

interface LocationAutocompleteProps {
  city: string;
  state: string;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  cityPlaceholder?: string;
  statePlaceholder?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  city,
  state,
  onCityChange,
  onStateChange,
  cityPlaceholder = 'Enter city',
  statePlaceholder = 'Enter state',
}) => {
  const { theme: themeHook } = useTheme();
  const [cityFocused, setCityFocused] = useState(false);
  const [stateFocused, setStateFocused] = useState(false);
  const cityBorderWidthAnim = useRef(new Animated.Value(1)).current;
  const stateBorderWidthAnim = useRef(new Animated.Value(1)).current;

  // Animate city border on focus/blur
  useEffect(() => {
    Animated.timing(cityBorderWidthAnim, {
      toValue: cityFocused ? 2 : 1,
      duration: ANIMATION_DURATIONS.FAST,
      easing: ANIMATION_EASING.easeInOut,
      useNativeDriver: false,
    }).start();
  }, [cityFocused, cityBorderWidthAnim]);

  // Animate state border on focus/blur
  useEffect(() => {
    Animated.timing(stateBorderWidthAnim, {
      toValue: stateFocused ? 2 : 1,
      duration: ANIMATION_DURATIONS.FAST,
      easing: ANIMATION_EASING.easeInOut,
      useNativeDriver: false,
    }).start();
  }, [stateFocused, stateBorderWidthAnim]);

  const cityBorderColor = cityFocused ? themeHook.colors.primary : themeHook.colors.border;
  const stateBorderColor = stateFocused ? themeHook.colors.primary : themeHook.colors.border;
  
  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, { marginBottom: theme.spacing.lg }]}>
        <Text style={[styles.label, { color: themeHook.colors.text }]}>City</Text>
        <Animated.View
          style={[
            styles.animatedBorder,
            {
              borderWidth: cityBorderWidthAnim,
              borderColor: cityBorderColor,
            },
          ]}
          pointerEvents="none"
        />
        <TextInput
          style={[styles.input, { borderWidth: 0, backgroundColor: themeHook.colors.surface, color: themeHook.colors.text }]}
          placeholder={cityPlaceholder}
          value={city}
          onChangeText={onCityChange}
          onFocus={() => setCityFocused(true)}
          onBlur={() => setCityFocused(false)}
          autoCapitalize="words"
          placeholderTextColor={themeHook.colors.textTertiary}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: themeHook.colors.text }]}>State</Text>
        <Animated.View
          style={[
            styles.animatedBorder,
            {
              borderWidth: stateBorderWidthAnim,
              borderColor: stateBorderColor,
            },
          ]}
          pointerEvents="none"
        />
        <TextInput
          style={[styles.input, { borderWidth: 0, backgroundColor: themeHook.colors.surface, color: themeHook.colors.text }]}
          placeholder={statePlaceholder}
          value={state}
          onChangeText={onStateChange}
          onFocus={() => setStateFocused(true)}
          onBlur={() => setStateFocused(false)}
          autoCapitalize="characters"
          placeholderTextColor={themeHook.colors.textTertiary}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // gap replaced with marginBottom on first input container
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 16,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
});

