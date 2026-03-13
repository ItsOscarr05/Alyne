import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import styles from './AlertModal.module.css';

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

function getIcon(type: AlertType) {
  switch (type) {
    case 'success':
      return <CheckCircle size={48} className={styles.iconSuccess} />;
    case 'error':
      return <XCircle size={48} className={styles.iconError} />;
    case 'warning':
      return <AlertTriangle size={48} className={styles.iconWarning} />;
    default:
      return <Info size={48} className={styles.iconInfo} />;
  }
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
  useEffect(() => {
    if (visible && type === 'success') {
      const timer = setTimeout(() => {
        onButtonPress?.();
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, type, onClose, onButtonPress]);

  const handleButtonPress = () => {
    onButtonPress?.();
    onClose();
  };

  const isSuccess = type === 'success';

  return (
    <Modal visible={visible} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.iconContainer}>{getIcon(type)}</div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        {!isSuccess && (
          <div className={styles.buttonContainer}>
            <Button title={buttonText} onPress={handleButtonPress} variant="primary" fullWidth />
          </div>
        )}
      </div>
    </Modal>
  );
}
