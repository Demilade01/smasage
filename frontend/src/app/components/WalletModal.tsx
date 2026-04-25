import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const installLinkRef = useRef<HTMLAnchorElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Remember what was focused before opening so we can restore it on close
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !isOpen) return;

      // Collect all focusable elements inside the modal
      const modal = document.getElementById('wallet-modal-content');
      if (!modal) return;
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    if (isOpen) {
      // Store current focus target before modal opens
      previousFocusRef.current = document.activeElement as HTMLElement;
      window.addEventListener('keydown', handleEscape);
      window.addEventListener('keydown', handleFocusTrap);
      document.body.style.overflow = 'hidden';
      // Move focus into the modal on next frame
      requestAnimationFrame(() => {
        installLinkRef.current?.focus();
      });
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('keydown', handleFocusTrap);
      document.body.style.overflow = 'unset';
      // Restore focus to the element that triggered the modal
      if (!isOpen && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        id="wallet-modal-content"
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <button
          ref={closeButtonRef}
          className="modal-close-icon"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <h2 id="modal-title" style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>
          Freighter Wallet Not Detected
        </h2>

        <p id="modal-description" className="text-muted" style={{ marginBottom: '2rem' }}>
          Please install the Freighter browser extension to securely connect your Stellar wallet and start crushing your goals.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <a
            ref={installLinkRef}
            href="https://freighter.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="install-link"
          >
            Install Freighter
          </a>

          <button
            onClick={onClose}
            className="close-modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

