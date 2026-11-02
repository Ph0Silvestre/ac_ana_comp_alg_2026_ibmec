import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import styles from './ui.module.css';

interface Props {
  open: boolean;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  align?: 'left' | 'right';
}

/** Confirmação flutuante no lugar de window.confirm. Esc cancela. */
export function ConfirmInline({ open, message, confirmLabel, onConfirm, onCancel, align = 'left' }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="alertdialog"
          aria-label={message}
          className={`${styles.confirm} ${align === 'right' ? styles.confirmRight : ''}`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          <p>{message}</p>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.danger} onClick={onConfirm}>
              {confirmLabel}
            </button>
            <button type="button" ref={cancelRef} className={styles.ghost} onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
