import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, style, secureTextEntry, ...inputProps }) => {
  const hasError = Boolean(error);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, hasError && styles.inputError, isPasswordField && styles.inputWithIcon, style]}
          placeholderTextColor={theme.colors.neutral[500]}
          secureTextEntry={isPasswordField && !isPasswordVisible}
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
  inputContainer: {
    position: 'relative',
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


