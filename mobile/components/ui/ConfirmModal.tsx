import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { theme } from '../../theme';
import { Button } from './Button';

export type ConfirmType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmModal({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  const getIconConfig = () => {
    switch (type) {
      case 'danger':
        return { 
          name: 'alert-circle' as const, 
          color: theme.colors.semantic.error,
          bgColor: '#FEE2E2',
        };
      case 'warning':
        return { 
          name: 'warning' as const, 
          color: theme.colors.semantic.warning,
          bgColor: '#FEF3C7',
        };
      case 'success':
        return { 
          name: 'checkmark-circle' as const, 
          color: theme.colors.semantic.success,
          bgColor: '#D1FAE5',
        };
      default:
        return { 
          name: 'information-circle' as const, 
          color: theme.colors.primary[500],
          bgColor: theme.colors.primary[50],
        };
    }
  };

  const iconConfig = getIconConfig();
  const isCompleteAction = confirmText.toLowerCase().includes('complete');

  return (
    <Modal visible={visible} onClose={onClose} dismissible>
      <View style={styles.borderWrapper}>
        <View style={styles.container}>
          <View style={[styles.iconContainer, { backgroundColor: iconConfig.bgColor }]}>
            <Ionicons name={iconConfig.name} size={56} color={iconConfig.color} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonContainer}>
            <Button
              title={cancelText}
              onPress={handleCancel}
              variant="secondary"
              style={styles.button}
            />
            <Button
              title={confirmText}
              onPress={handleConfirm}
              variant="primary"
              style={[
                styles.button, 
                type === 'danger' && styles.dangerButton,
                (type === 'success' || isCompleteAction) && styles.successButton,
              ]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  borderWrapper: {
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: theme.radii.lg,
    width: '100%',
  },
  container: {
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    minWidth: 320,
    maxWidth: 400,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h2,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.neutral[900],
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  message: {
    ...theme.typography.body,
    fontSize: 15,
    color: theme.colors.neutral[600],
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
    lineHeight: 22,
    paddingHorizontal: theme.spacing.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: theme.spacing.md,
    justifyContent: 'center',
  },
  button: {
    minWidth: 120,
  },
  dangerButton: {
    backgroundColor: theme.colors.semantic.error,
  },
  successButton: {
    backgroundColor: theme.colors.semantic.success,
  },
});

