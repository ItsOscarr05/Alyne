import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { theme } from '../../theme';
import { Button } from './Button';

interface NetworkErrorModalProps {
  visible: boolean;
  onClose: () => void;
  onRetry?: () => void;
  message?: string;
}

export function NetworkErrorModal({
  visible,
  onClose,
  onRetry,
  message = 'Unable to connect to the server. Please check your internet connection and try again.',
}: NetworkErrorModalProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={theme.colors.semantic.error} />
        </View>
        <Text style={styles.title}>No Connection</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.buttonContainer}>
          {onRetry && (
            <Button
              title="Retry"
              onPress={handleRetry}
              variant="primary"
              style={styles.button}
            />
          )}
          <Button
            title="OK"
            onPress={onClose}
            variant={onRetry ? "secondary" : "primary"}
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
    fontWeight: '600',
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
    gap: theme.spacing.md,
  },
  button: {
    width: '100%',
  },
});

