import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/Modal.css';

const FavoriteModal = ({ isOpen, onClose, onConfirm, recipe }) => {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error('Error adding to favorites:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content favorite-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add to Favorites</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="recipe-preview">
                        <img src={recipe?.image} alt={recipe?.title} className="recipe-preview-image" />
                        <div className="recipe-preview-info">
                            <h3>{recipe?.title}</h3>
                            <div className="recipe-preview-meta">
                                {recipe?.readyInMinutes && <span>⏱️ {recipe.readyInMinutes} min</span>}
                                {recipe?.servings && <span>👥 {recipe.servings} servings</span>}
                            </div>
                        </div>
                    </div>

                    <div className="favorite-message">
                        <div className="favorite-icon">❤️</div>
                        <p>Save this delicious recipe to your favorites collection for quick access later!</p>
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Adding...' : 'Add to Favorites'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render the modal at the document root level using a portal
    return createPortal(modalContent, document.body);
};

export default FavoriteModal;