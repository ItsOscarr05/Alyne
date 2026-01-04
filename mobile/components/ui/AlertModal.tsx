import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { theme } from '../../theme';
import { Button } from './Button';
import { useTheme } from '../../contexts/ThemeContext';

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
  const themeHook = useTheme();

  // Auto-close success modals after 2.5 seconds
  useEffect(() => {
    if (visible && type === 'success') {
      const timer = setTimeout(() => {
        if (onButtonPress) {
          onButtonPress();
        }
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, type, onClose, onButtonPress]);

  const handleButtonPress = () => {
    if (onButtonPress) {
      onButtonPress();
    }
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle' as const, color: themeHook.colors.success };
      case 'error':
        return { name: 'close-circle' as const, color: themeHook.colors.error };
      case 'warning':
        return { name: 'warning' as const, color: themeHook.colors.warning };
      default:
        return { name: 'information-circle' as const, color: themeHook.colors.info };
    }
  };

  const icon = getIcon();
  const isSuccess = type === 'success';

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon.name} size={48} color={icon.color} />
        </View>
        <Text style={[styles.title, { color: themeHook.colors.text }]}>{title}</Text>
        <Text style={[styles.message, { color: themeHook.colors.textSecondary }]}>{message}</Text>
        {!isSuccess && (
          <View style={styles.buttonContainer}>
            <Button
              title={buttonText}
              onPress={handleButtonPress}
              variant="primary"
              style={styles.button}
            />
          </View>
        )}
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
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  message: {
    ...theme.typography.body,
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

