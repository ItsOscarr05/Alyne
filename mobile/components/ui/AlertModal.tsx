import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { theme } from '../../theme';
import { Button } from './Button';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: AlertType;
  buttonText?: string;
  onButtonPress?: () => void;
}

export function AlertModal({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = 'OK',
  onButtonPress,
}: AlertModalProps) {
  const handleButtonPress = () => {
    if (onButtonPress) {
      onButtonPress();
    }
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle' as const, color: theme.colors.semantic.success };
      case 'error':
        return { name: 'close-circle' as const, color: theme.colors.semantic.error };
      case 'warning':
        return { name: 'warning' as const, color: theme.colors.semantic.warning };
      default:
        return { name: 'information-circle' as const, color: theme.colors.semantic.info };
    }
  };

  const icon = getIcon();

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon.name} size={48} color={icon.color} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.buttonContainer}>
          <Button
            title={buttonText}
            onPress={handleButtonPress}
            variant="primary"
            style={styles.button}
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
    width: '100%',
  },
  button: {
    width: '100%',
  },
});

