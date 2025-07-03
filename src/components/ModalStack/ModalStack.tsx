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

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-stack-overlay" onClick={onOverlayClick}>
      <div className="modal-stack" onClick={handleModalClick}>
        {modals}
      </div>
    </div>
  );
}
