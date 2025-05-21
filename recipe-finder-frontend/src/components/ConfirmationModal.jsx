// src/components/ConfirmationModal.jsx
import React from 'react';
import '../styles/ConfirmationModal.css'; // We'll create this CSS file

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel" }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="confirmation-modal-overlay">
            <div className="confirmation-modal-content">
                {title && <h2>{title}</h2>}
                <p>{message}</p>
                <div className="confirmation-modal-actions">
                    <button onClick={onClose} className="btn btn-secondary">
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} className="btn btn-danger"> {/* Use a danger style for confirm remove */}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;