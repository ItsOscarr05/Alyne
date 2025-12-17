import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { theme } from '../../theme';
import { Button } from './Button';

export type ConfirmType = 'danger' | 'warning' | 'info';

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

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return { name: 'alert-circle' as const, color: theme.colors.semantic.error };
      case 'warning':
        return { name: 'warning' as const, color: theme.colors.semantic.warning };
      default:
        return { name: 'help-circle' as const, color: theme.colors.semantic.info };
    }
  };

  const icon = getIcon();

  return (
    <Modal visible={visible} onClose={onClose} dismissible>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon.name} size={48} color={icon.color} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.buttonContainer}>
          <Button
            title={cancelText}
            onPress={handleCancel}
            variant="secondary"
            style={[styles.button, styles.cancelButton]}
          />
          <Button
            title={confirmText}
            onPress={handleConfirm}
            variant={type === 'danger' ? 'primary' : 'primary'}
            style={[styles.button, type === 'danger' && styles.dangerButton]}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.neutral[900],
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.neutral[700],
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: theme.colors.neutral[200],
  },
  dangerButton: {
    backgroundColor: theme.colors.semantic.error,
  },
});

