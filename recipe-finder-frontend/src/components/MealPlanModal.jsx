import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/Modal.css';

const MealPlanModal = ({ isOpen, onClose, onConfirm, recipe }) => {
    const [date, setDate] = useState('');
    const [mealType, setMealType] = useState('');
    const [loading, setLoading] = useState(false);
    const [calendarView, setCalendarView] = useState('month');

    const mealTypes = [
        { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
        { value: 'lunch', label: 'Lunch', icon: '☀️' },
        { value: 'dinner', label: 'Dinner', icon: '🌙' },
        { value: 'snack', label: 'Snack', icon: '🍿' }
    ];

    // Calendar functionality
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    const calendarDays = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    const formatDate = (year, month, day) => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const handleDateClick = (day) => {
        if (day) {
            const selectedDate = formatDate(currentYear, currentMonth, day);
            const dateObj = new Date(currentYear, currentMonth, day);

            // Prevent selecting past dates
            if (dateObj >= today.setHours(0, 0, 0, 0)) {
                setDate(selectedDate);
            }
        }
    };

    const navigateMonth = (direction) => {
        if (direction === 'prev') {
            if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
            } else {
                setCurrentMonth(currentMonth - 1);
            }
        } else {
            if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
            } else {
                setCurrentMonth(currentMonth + 1);
            }
        }
    };

    const isDateSelected = (day) => {
        if (!day || !date) return false;
        const checkDate = formatDate(currentYear, currentMonth, day);
        return checkDate === date;
    };

    const isDatePast = (day) => {
        if (!day) return false;
        const checkDate = new Date(currentYear, currentMonth, day);
        return checkDate < today.setHours(0, 0, 0, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!date || !mealType) return;

        setLoading(true);
        try {
            await onConfirm(date, mealType);
            setDate('');
            setMealType('');
            onClose();
        } catch (error) {
            console.error('Error adding to meal plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setDate('');
        setMealType('');
        onClose();
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content meal-plan-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add to Meal Plan</h2>
                    <button className="modal-close" onClick={handleClose}>×</button>
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

                    <form onSubmit={handleSubmit} className="meal-plan-form">
                        <div className="form-group">
                            <label>Select Date</label>
                            <div className="calendar-container">
                                <div className="calendar-header">
                                    <button
                                        type="button"
                                        className="calendar-nav"
                                        onClick={() => navigateMonth('prev')}
                                    >
                                        &#8249;
                                    </button>
                                    <span className="calendar-month-year">
                                        {monthNames[currentMonth]} {currentYear}
                                    </span>
                                    <button
                                        type="button"
                                        className="calendar-nav"
                                        onClick={() => navigateMonth('next')}
                                    >
                                        &#8250;
                                    </button>
                                </div>

                                <div className="calendar-weekdays">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="calendar-weekday">{day}</div>
                                    ))}
                                </div>

                                <div className="calendar-grid">
                                    {calendarDays.map((day, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            className={`calendar-day ${day ? 'available' : 'empty'
                                                } ${isDateSelected(day) ? 'selected' : ''
                                                } ${isDatePast(day) ? 'past' : ''
                                                }`}
                                            onClick={() => handleDateClick(day)}
                                            disabled={!day || isDatePast(day)}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>

                                {date && (
                                    <div className="selected-date-display">
                                        Selected: {new Date(date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Select Meal Type</label>
                            <div className="meal-type-grid">
                                {mealTypes.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        className={`meal-type-btn ${mealType === type.value ? 'selected' : ''}`}
                                        onClick={() => setMealType(type.value)}
                                    >
                                        <span className="meal-type-icon">{type.icon}</span>
                                        <span className="meal-type-label">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="btn btn-secondary"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading || !date || !mealType}
                            >
                                {loading ? 'Adding...' : 'Add to Meal Plan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );

    // Render the modal at the document root level using a portal
    return createPortal(modalContent, document.body);
};

export default MealPlanModal;