// src/components/Notification.jsx
import React, { useEffect } from 'react';
import '../styles/Notification.css'; // We'll create this CSS file

const Notification = ({ message, type = 'success', duration = 3000, onClose }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [message, duration, onClose]);

    if (!message) {
        return null;
    }

    return (
        <div className={`notification notification-${type}`}>
            {message}
            <button onClick={onClose} className="notification-close-btn">×</button>
        </div>
    );
};

export default Notification;