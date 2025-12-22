import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'One number',
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: 'special',
    label: 'One special character',
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  },
];

interface PasswordRequirementsProps {
  password: string;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password }) => {
  const requirementStatuses = useMemo(() => {
    return requirements.map((req) => ({
      ...req,
      met: req.test(password),
    }));
  }, [password]);

  const unmetRequirements = requirementStatuses.filter((req) => !req.met);
  const nextRequirement = unmetRequirements[0];

  if (!password) {
    return null;
  }

  return (
    <View style={styles.container}>
      {requirementStatuses.map((requirement) => {
        const isNext = requirement === nextRequirement;
        const isMet = requirement.met;

        return (
          <View
            key={requirement.id}
            style={[
              styles.requirementItem,
              isNext && !isMet && styles.requirementItemNext,
              isMet && styles.requirementItemMet,
            ]}
          >
            <Ionicons
              name={isMet ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={
                isMet
                  ? theme.colors.semantic.success
                  : isNext
                    ? theme.colors.primary[500]
                    : theme.colors.neutral[500]
              }
            />
            <Text
              style={[
                styles.requirementText,
                isMet && styles.requirementTextMet,
                isNext && !isMet && styles.requirementTextNext,
                { marginLeft: theme.spacing.sm },
              ]}
            >
              {requirement.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  requirementItemNext: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.sm,
  },
  requirementItemMet: {
    opacity: 0.7,
  },
  requirementText: {
    fontSize: 13,
    color: theme.colors.neutral[500],
  },
  requirementTextMet: {
    color: theme.colors.semantic.success,
    textDecorationLine: 'line-through',
  },
  requirementTextNext: {
    color: theme.colors.primary[600],
    fontWeight: '600',
  },
});
