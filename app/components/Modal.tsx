'use client';

import { useEffect } from 'react';
import clsx from 'clsx';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export default function Modal({ isOpen, onClose, children, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modalOverlay} onClick={onClose} />
      <div className={clsx(styles.modalContent, className)}>{children}</div>
    </div>
  );
}

export function ModalClose({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={styles.modalClose} onClick={onClick}>
      ✕
    </button>
  );
}
