import React, { useEffect } from 'react';
import '../styles/BottomSheet.css';

function BottomSheet({ isOpen, onClose, title, options, onSelect, value }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet-container" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <div className="bottom-sheet-handle"></div>
          <h3 className="bottom-sheet-title">{title}</h3>
          <button className="bottom-sheet-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="bottom-sheet-content">
          {options.map((option) => (
            <button
              key={option.value}
              className={`bottom-sheet-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <span className="option-label">{option.label}</span>
              {value === option.value && (
                <span className="option-check">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BottomSheet;
