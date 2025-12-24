import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { theme } from '../../theme';

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
  const [cityFocused, setCityFocused] = useState(false);
  const [stateFocused, setStateFocused] = useState(false);
  
  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, { marginBottom: theme.spacing.lg }]}>
        <Text style={styles.label}>City</Text>
        <TextInput
          style={[styles.input, cityFocused && styles.inputFocused]}
          placeholder={cityPlaceholder}
          value={city}
          onChangeText={onCityChange}
          onFocus={() => setCityFocused(true)}
          onBlur={() => setCityFocused(false)}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>State</Text>
        <TextInput
          style={[styles.input, stateFocused && styles.inputFocused]}
          placeholder={statePlaceholder}
          value={state}
          onChangeText={onStateChange}
          onFocus={() => setStateFocused(true)}
          onBlur={() => setStateFocused(false)}
          autoCapitalize="words"
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 16,
    backgroundColor: theme.colors.white,
    color: theme.colors.neutral[900],
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  inputFocused: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
});
