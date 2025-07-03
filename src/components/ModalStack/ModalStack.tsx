import React from 'react';
import './ModalStack.css';

export function ModalStack({
  modals,
  onOverlayClick,
}: {
  modals: React.ReactNode[];
  onOverlayClick?: () => void;
}) {
  if (!modals.length) return null;
  return (
    <div className="modal-stack-overlay" onClick={onOverlayClick}>
      <div
        className="modal-stack"
        style={{ gap: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        {modals}
      </div>
    </div>
  );
}
