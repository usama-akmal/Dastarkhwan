import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Accessible dialog shell, styled as a bottom sheet on phones and a centred dialog
 * from 600px up.
 *
 * Provides `role="dialog"`, `aria-modal`, a labelled heading, focus moved in and
 * trapped, Escape to close, backdrop-click to close, and background scroll lock.
 * Every modal in the app goes through this so the behaviour cannot diverge.
 */
export const Modal = ({ title, titleId = 'modal-title', onClose, children, footer }) => {
  const containerRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    const node = containerRef.current;
    const first = node?.querySelector(FOCUSABLE);
    (first || node)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
      // Return focus to whatever opened the dialog so tab order is not lost.
      if (previouslyFocused.current instanceof HTMLElement) previouslyFocused.current.focus();
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(containerRef.current?.querySelectorAll(FOCUSABLE) || []);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={containerRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="modal__grabber" aria-hidden="true" />

        <div className="modal__header">
          <h2 id={titleId} className="modal__title">{title}</h2>
          <button
            type="button"
            className="btn btn-icon"
            onClick={onClose}
            aria-label="Close"
            style={{ minWidth: 36, minHeight: 36, marginTop: -4 }}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
