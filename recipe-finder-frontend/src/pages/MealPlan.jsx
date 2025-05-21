import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { mealPlanService } from '../services/api.js';
import '../styles/MealPlan.css';
import { useNavigate } from 'react-router-dom';
import Notification from '../components/Notification.jsx';

const MealPlan = () => {
    const { currentUser } = useAuth();
    const [mealPlan, setMealPlan] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [removingMealId, setRemovingMealId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) { // Ensure currentUser is available before loading
            loadMealPlan();
        } else {
            setLoading(false); // Not logged in, don't attempt to load
            // Optionally: setError('Please log in to view your meal plan.');
        }
    }, [currentUser, selectedWeek]);

    function getCurrentWeek() {
        const today = new Date();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1)); // Get Monday (handles Sunday as day 0)
        return monday.toISOString().split('T')[0];
    }

    const loadMealPlan = async () => {
        if (!currentUser) {
            setError('User not authenticated.');
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(''); // Clear previous errors
            const startDate = new Date(selectedWeek);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // Get Sunday

            const data = await mealPlanService.getMealPlan(currentUser.uid, {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });
            setMealPlan(data);
        } catch (error) {
            setError('Failed to load meal plan. Please try again.');
            console.error('Error loading meal plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateWeekDays = () => {
        const days = [];
        const startDate = new Date(selectedWeek);

        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            days.push({
                date: date.toISOString().split('T')[0],
                dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
                dayNumber: date.getDate(),
                isToday: date.toDateString() === new Date().toDateString()
            });
        }
        return days;
    };

    const getMealsForDate = (date) => {
        return mealPlan.filter(meal => meal.date === date);
    };

    const handleWeekChange = (direction) => {
        const currentDate = new Date(selectedWeek);
        currentDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedWeek(currentDate.toISOString().split('T')[0]);
    };

    // Function to handle navigation to recipe detail page
    const handleMealClick = (recipeId) => {
        if (recipeId) {
            navigate(`/recipe/${recipeId}`);
        } else {
            console.warn('Clicked meal item without a valid recipe ID.');
        }
    };

    // Function to handle removing a meal from the plan
    const handleRemoveMeal = async (mealId) => {
        if (!currentUser || !mealId) {
            setNotification({
                message: 'Cannot remove meal: missing user or meal information.',
                type: 'error'
            });
            return;
        }

        try {
            setRemovingMealId(mealId); // Visually indicate loading state for the button
            await mealPlanService.removeMealFromPlan(currentUser.uid, mealId);

            // Update local state to reflect removal
            setMealPlan(prevMealPlan => prevMealPlan.filter(meal => meal.id !== mealId));

            setNotification({
                message: 'Meal removed from your plan successfully.',
                type: 'success'
            });
        } catch (error) {
            console.error('Error removing meal from plan:', error);
            setNotification({
                message: error.message || 'Failed to remove meal from plan. Please try again.',
                type: 'error'
            });
        } finally {
            setRemovingMealId(null); // Reset loading state for the button
        }
    };

    const handleCloseNotification = () => {
        setNotification({ message: '', type: '' });
    };

    if (!currentUser) {
        return (
            <div className="meal-plan-page">
                <div className="meal-plan-header glass-card animated-gradient">
                    <div className="welcome-emoji">📅</div>
                    <h1>Weekly Meal Plan</h1>
                </div>
                <div className="empty-state-container glass-card" style={{ marginTop: '50px' }}>
                    <div className="empty-icon">🔑</div>
                    <h2>Login Required</h2>
                    <p>Please log in to access your meal plan and organize your week.</p>
                    <button onClick={() => navigate('/login')} className="cta-button primary">
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="loading-container animated-gradient">
                <div className="loading-spinner"></div>
                <p>Loading your meal plan...</p>
            </div>
        );
    }

    if (error && !mealPlan.length) { // Show error primarily if there's no data to display
        return (
            <div className="error-container animated-gradient">
                <div className="error-icon">⚠️</div>
                <h2>Oops!</h2>
                <p>{error}</p>
                <button onClick={loadMealPlan} className="btn btn-primary">Try Again</button>
            </div>
        );
    }

    const weekDays = generateWeekDays();

    return (
        <div className="meal-plan-page">
            <div className="meal-plan-header glass-card animated-gradient">
                <div className="welcome-emoji">📅</div>
                <h1>Weekly Meal Plan</h1>
                <p>Organize your meals for the week ahead and stay on track with your culinary goals.</p>
                <div className="week-navigation">
                    <button onClick={() => handleWeekChange('prev')} className="cta-button secondary">
                        ← Previous Week
                    </button>
                    <span className="current-week-display glass-card">
                        {new Date(selectedWeek).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric'
                        })} - {new Date(new Date(selectedWeek).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </span>
                    <button onClick={() => handleWeekChange('next')} className="cta-button secondary">
                        Next Week →
                    </button>
                </div>
            </div>
            {error && <Notification message={error} type="error" duration={5000} onClose={() => setError('')} />}


            <div className="meal-plan-grid">
                {weekDays.map(day => {
                    const dayMeals = getMealsForDate(day.date);
                    const mealsByType = {
                        breakfast: dayMeals.filter(meal => meal.mealType === 'breakfast'),
                        lunch: dayMeals.filter(meal => meal.mealType === 'lunch'),
                        dinner: dayMeals.filter(meal => meal.mealType === 'dinner'),
                        snack: dayMeals.filter(meal => meal.mealType === 'snack')
                    };

                    return (
                        <div key={day.date} className={`day-column glass-card ${day.isToday ? 'today' : ''}`}>
                            <div className="day-header">
                                <span className="day-name">{day.dayName}</span>
                                <span className="day-number">{day.dayNumber}</span>
                                {day.isToday && <div className="today-marker">Today</div>}
                            </div>

                            <div className="meals-container">
                                {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => (
                                    <div key={mealType} className="meal-section">
                                        <h4 className="meal-type-heading">{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</h4>
                                        {mealsByType[mealType].length > 0 ? (
                                            <div className="meal-items">
                                                {mealsByType[mealType].map(meal => (
                                                    <div
                                                        key={meal.id || (meal.recipe && (meal.recipe.id || meal.recipe.idMeal)) || Math.random().toString()}
                                                        className="meal-item glass-card"
                                                    >
                                                        <div
                                                            className="meal-content"
                                                            onClick={() => meal.recipe && (meal.recipe.id || meal.recipe.idMeal) && handleMealClick(meal.recipe.id || meal.recipe.idMeal)}
                                                        >
                                                            <img
                                                                src={(meal.recipe && meal.recipe.image) || `https://via.placeholder.com/45x45.png?text=No+Img`}
                                                                alt={(meal.recipe && meal.recipe.title) || (meal.recipe && meal.recipe.strMeal) || 'Meal image'}
                                                                className="meal-image"
                                                            />
                                                            <div className="meal-info">
                                                                <span className="meal-title">{(meal.recipe && meal.recipe.title) || (meal.recipe && meal.recipe.strMeal) || 'Recipe Title Missing'}</span>
                                                                {(meal.recipe && meal.recipe.readyInMinutes) && (
                                                                    <span className="meal-time">⏱️ {meal.recipe.readyInMinutes} min</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            className="remove-meal-btn"
                                                            onClick={() => handleRemoveMeal(meal.id)} // meal.id is the ID of the meal plan entry
                                                            disabled={removingMealId === meal.id}
                                                            title="Remove from meal plan"
                                                        >
                                                            {removingMealId === meal.id ? (
                                                                <span className="btn-loading-small"></span>
                                                            ) : (
                                                                '✕'
                                                            )}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="meal-empty">
                                                <span>No {mealType} planned</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {mealPlan.length === 0 && !loading && !error && ( // Show empty state only if no errors and not loading
                <div className="empty-state-container glass-card">
                    <div className="empty-icon">🍽️</div>
                    <h2>Your Meal Plan is Empty</h2>
                    <p>Let's fill it up! Find delicious recipes and add them to your plan.</p>
                    <a href="/search" className="cta-button primary">
                        Discover Recipes
                    </a>
                </div>
            )}

            {/* Notification Component */}
            <Notification
                message={notification.message}
                type={notification.type}
                duration={3000}
                onClose={handleCloseNotification}
            />
        </div>
    );
};

export default MealPlan;