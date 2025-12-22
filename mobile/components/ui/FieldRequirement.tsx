import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface FieldRequirementProps {
  met: boolean;
  message: string;
  showWhenEmpty?: boolean; // Show requirement even when field is empty
}

export const FieldRequirement: React.FC<FieldRequirementProps> = ({
  met,
  message,
  showWhenEmpty = false,
}) => {
  if (!showWhenEmpty && met) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={met ? theme.colors.semantic.success : theme.colors.neutral[500]}
      />
      <Text style={[styles.text, met && styles.textMet, { marginLeft: theme.spacing.xs }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  text: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  textMet: {
    color: theme.colors.semantic.success,
    textDecorationLine: 'line-through',
  },
});

