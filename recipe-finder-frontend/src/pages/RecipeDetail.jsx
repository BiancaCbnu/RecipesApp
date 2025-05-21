import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useFavorites } from '../contexts/FavoritesContext.jsx';
import { recipeService, mealPlanService } from '../services/api.js';
import Notification from '../components/Notification.jsx';
import MealPlanModal from '../components/MealPlanModal.jsx';
import '../styles/RecipeDetail.css';

const RecipeDetail = () => {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Use the FavoritesContext
    const { isFavorited, addFavorite, removeFavorite } = useFavorites();

    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('ingredients');
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [showMealPlanModal, setShowMealPlanModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadRecipeDetails();
    }, [id, currentUser]);

    const loadRecipeDetails = async () => {
        try {
            setLoading(true);
            const data = await recipeService.getRecipeDetails(id);
            setRecipe(data);
        } catch (error) {
            setError('Failed to load recipe details');
            console.error('Error loading recipe:', error);
        } finally {
            setLoading(false);
        }
    };

    const isRecipeFavorited = recipe && isFavorited(recipe.id || recipe.idMeal);

    const handleFavoriteClick = async () => {
        if (!currentUser) {
            setNotification({
                message: 'Please log in to manage favorites',
                type: 'warning'
            });
            return;
        }

        if (!recipe || !recipe.id) {
            setNotification({
                message: 'Recipe information is missing',
                type: 'error'
            });
            return;
        }

        setActionLoading(true);
        try {
            let result;
            if (isRecipeFavorited) {
                result = await removeFavorite(recipe.id);
                result.action = 'favoriteRemoved';
            } else {
                // Prepare recipe data for favorite
                const recipeDataForFavorite = {
                    id: recipe.id,
                    title: recipe.title,
                    image: recipe.image,
                    ...(recipe.readyInMinutes !== undefined && { readyInMinutes: recipe.readyInMinutes }),
                    ...(recipe.servings !== undefined && { servings: recipe.servings }),
                    category: recipe.category || recipe.strCategory || (recipe.dishTypes?.[0]),
                    area: recipe.area || recipe.strArea || (recipe.cuisines?.[0]),
                    dateAdded: new Date().toISOString()
                };
                result = await addFavorite(recipe.id, recipeDataForFavorite);
                result.action = 'favoriteAdded';
            }

            setNotification({
                message: result.message,
                type: 'success'
            });
        } catch (error) {
            console.error('Error toggling favorite:', error);
            setNotification({
                message: `Failed to update favorites for "${recipe.title}". Please try again.`,
                type: 'error'
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleMealPlanClick = () => {
        if (!currentUser) {
            setNotification({
                message: 'Please log in to add recipes to your meal plan',
                type: 'warning'
            });
            return;
        }

        if (!recipe || !recipe.id) {
            setNotification({
                message: 'Recipe information is missing',
                type: 'error'
            });
            return;
        }

        setShowMealPlanModal(true);
    };

    const handleMealPlanConfirm = async (date, mealType) => {
        if (!currentUser || !recipe || !recipe.id) {
            setNotification({
                message: 'User or recipe data missing for meal plan.',
                type: 'error'
            });
            setShowMealPlanModal(false);
            return;
        }

        setActionLoading(true);
        try {
            // Prepare recipe data for meal plan
            const recipeDataForMealPlan = {
                id: recipe.id,
                title: recipe.title,
                image: recipe.image,
                ...(recipe.readyInMinutes !== undefined && { readyInMinutes: recipe.readyInMinutes }),
                ...(recipe.servings !== undefined && { servings: recipe.servings }),
            };

            // Add to meal plan
            await mealPlanService.addToMealPlan(currentUser.uid, date, mealType, recipeDataForMealPlan);

            // Show success notification
            setNotification({
                message: `Recipe added to your ${mealType} on ${new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}!`,
                type: 'success'
            });
        } catch (error) {
            console.error('Error adding to meal plan:', error);
            setNotification({
                message: `Failed to add "${recipe.title}" to meal plan. Please try again.`,
                type: 'error'
            });
        } finally {
            setActionLoading(false);
            setShowMealPlanModal(false);
        }
    };

    const handleCloseNotification = () => {
        setNotification({ message: '', type: '' });
    };

    // Render loading state
    if (loading) {
        return (
            <div className="recipe-detail">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your delicious recipe...</p>
                    <div className="recipe-skeleton">
                        <div className="skeleton-header">
                            <div className="skeleton-info">
                                <div className="skeleton-title"></div>
                                <div className="skeleton-meta"></div>
                                <div className="skeleton-actions"></div>
                            </div>
                            <div className="skeleton-image"></div>
                        </div>
                        <div className="skeleton-content">
                            <div className="skeleton-section"></div>
                            <div className="skeleton-section"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="recipe-detail">
                <div className="error-container glass-card">
                    <div className="error-icon">❌</div>
                    <h2>Recipe Not Available</h2>
                    <p>{error}</p>
                    <div className="error-actions">
                        <button onClick={() => loadRecipeDetails()} className="btn btn-primary">
                            Try Again
                        </button>
                        <Link to="/search" className="btn btn-secondary">
                            Back to Search
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Render not found state
    if (!recipe) {
        return (
            <div className="recipe-detail">
                <div className="error-container glass-card">
                    <div className="error-icon">🔍</div>
                    <h2>Recipe Not Found</h2>
                    <p>The recipe (ID: {id}) might not exist or could not be loaded.</p>
                    <div className="error-actions">
                        <Link to="/search" className="btn btn-primary">
                            Back to Search
                        </Link>
                        <Link to="/" className="btn btn-secondary">
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Check for data availability
    const ingredientsExist = recipe.extendedIngredients && Array.isArray(recipe.extendedIngredients);
    const instructionsExist = recipe.analyzedInstructions &&
        Array.isArray(recipe.analyzedInstructions) &&
        recipe.analyzedInstructions.length > 0 &&
        recipe.analyzedInstructions[0].steps &&
        Array.isArray(recipe.analyzedInstructions[0].steps);
    const nutritionExists = recipe.nutrition && recipe.nutrition.nutrients && Array.isArray(recipe.nutrition.nutrients);

    return (
        <div className="recipe-detail">
            {/* Recipe Header with Image and Basic Info */}
            <div className="recipe-header glass-card">
                <div className="recipe-info">
                    <h1>{recipe.title}</h1>

                    <div className="recipe-meta">
                        {recipe.readyInMinutes && (
                            <div className="meta-item">
                                <span className="meta-icon">⏱️</span>
                                <span className="meta-text">{recipe.readyInMinutes} min</span>
                            </div>
                        )}

                        {recipe.servings && (
                            <div className="meta-item">
                                <span className="meta-icon">👥</span>
                                <span className="meta-text">{recipe.servings} servings</span>
                            </div>
                        )}

                        {recipe.pricePerServing && (
                            <div className="meta-item">
                                <span className="meta-icon">💰</span>
                                <span className="meta-text">${(recipe.pricePerServing / 100).toFixed(2)} per serving</span>
                            </div>
                        )}

                        {recipe.healthScore && (
                            <div className="meta-item">
                                <span className="meta-icon">❤️</span>
                                <span className="meta-text">{recipe.healthScore} health score</span>
                            </div>
                        )}
                    </div>

                    <div className="back-link">
                        <Link to="/search">← Back to search results</Link>
                    </div>
                </div>

                <div className="recipe-image">
                    <img
                        src={recipe.image || `https://via.placeholder.com/500x400.png?text=${encodeURIComponent(recipe.title || 'Recipe')}`}
                        alt={recipe.title}
                    />
                    {recipe.sourceName && (
                        <div className="recipe-source">
                            Source: {recipe.sourceName}
                        </div>
                    )}
                </div>
            </div>

            {/* Recipe Action Buttons - Moved down below the header */}
            <div className="recipe-actions-container glass-card">
                <button
                    onClick={handleFavoriteClick}
                    className={`btn ${isRecipeFavorited ? 'btn-favorited' : 'btn-primary'}`}
                    disabled={actionLoading || !currentUser}
                >
                    {actionLoading ? (
                        <span className="btn-loading"></span>
                    ) : isRecipeFavorited ? (
                        <>❤️ Saved to Favorites</>
                    ) : (
                        <>🤍 Add to Favorites</>
                    )}
                </button>

                <button
                    onClick={handleMealPlanClick}
                    className="btn btn-secondary"
                    disabled={actionLoading || !currentUser}
                >
                    {actionLoading ? (
                        <span className="btn-loading"></span>
                    ) : (
                        <>📅 Add to Meal Plan</>
                    )}
                </button>
            </div>

            {/* Recipe Summary Section */}
            {recipe.summary && (
                <section className="recipe-summary glass-card">
                    <h2>About This Recipe</h2>
                    <div className="summary-content" dangerouslySetInnerHTML={{ __html: recipe.summary }}></div>

                    {recipe.diets && recipe.diets.length > 0 && (
                        <div className="recipe-tags">
                            {recipe.diets.map(diet => (
                                <span key={diet} className="recipe-tag diet-tag">
                                    {diet}
                                </span>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Recipe Content Tabs */}
            <div className="recipe-tabs glass-card">
                <div className="tabs-header">
                    {ingredientsExist && (
                        <button
                            className={`tab-btn ${activeTab === 'ingredients' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ingredients')}
                        >
                            Ingredients
                        </button>
                    )}

                    {instructionsExist && (
                        <button
                            className={`tab-btn ${activeTab === 'instructions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('instructions')}
                        >
                            Instructions
                        </button>
                    )}

                    {nutritionExists && (
                        <button
                            className={`tab-btn ${activeTab === 'nutrition' ? 'active' : ''}`}
                            onClick={() => setActiveTab('nutrition')}
                        >
                            Nutrition
                        </button>
                    )}
                </div>

                <div className="tabs-content">
                    {/* Ingredients Tab */}
                    {activeTab === 'ingredients' && ingredientsExist && (
                        <div className="tab-pane">
                            <h3>What You'll Need</h3>
                            <ul className="ingredients-list">
                                {recipe.extendedIngredients.map((ingredient, index) => (
                                    <li key={ingredient.id || ingredient.original || index} className="ingredient-item">
                                        <div className="ingredient-amount">
                                            {ingredient.measures && ingredient.measures.metric && typeof ingredient.measures.metric.amount === 'number'
                                                ? `${ingredient.measures.metric.amount.toFixed(1)} `
                                                : (ingredient.measures && ingredient.measures.metric && ingredient.measures.metric.amount) || ''}
                                            {ingredient.measures && ingredient.measures.metric && (ingredient.measures.metric.unitShort || ingredient.measures.metric.unitLong || '')}
                                        </div>
                                        <div className="ingredient-name">
                                            {ingredient.nameClean || ingredient.name}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Instructions Tab */}
                    {activeTab === 'instructions' && instructionsExist && (
                        <div className="tab-pane">
                            <h3>How to Prepare</h3>
                            <ol className="instructions-list">
                                {recipe.analyzedInstructions[0].steps.map((step) => (
                                    <li key={step.number} className="instruction-item">
                                        <div className="step-number">{step.number}</div>
                                        <div className="step-instruction">{step.step}</div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* Nutrition Tab */}
                    {activeTab === 'nutrition' && nutritionExists && (
                        <div className="tab-pane">
                            <h3>Nutrition Information</h3>
                            <div className="nutrition-grid">
                                {recipe.nutrition.nutrients.slice(0, 8).map((nutrient) => (
                                    <div key={nutrient.name} className="nutrition-item">
                                        <span className="nutrient-name">{nutrient.name}</span>
                                        <span className="nutrient-amount">
                                            {typeof nutrient.amount === 'number' ? nutrient.amount.toFixed(1) : nutrient.amount}
                                            {nutrient.unit}
                                        </span>
                                        {nutrient.percentOfDailyNeeds && (
                                            <div className="daily-needs-bar">
                                                <div
                                                    className="daily-needs-fill"
                                                    style={{ width: `${Math.min(nutrient.percentOfDailyNeeds, 100)}%` }}
                                                ></div>
                                                <span className="daily-needs-text">
                                                    {Math.round(nutrient.percentOfDailyNeeds)}% DV
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Similar Recipes Suggestion */}
            <div className="similar-recipes glass-card">
                <h2>You Might Also Like</h2>
                <div className="suggestion-content">
                    <p>Looking for more delicious recipes like this? Check out our search page for more inspiration!</p>
                    <Link to="/search" className="btn btn-primary">Find More Recipes</Link>
                </div>
            </div>

            {/* Use the MealPlanModal component */}
            {currentUser && recipe && (
                <MealPlanModal
                    isOpen={showMealPlanModal}
                    onClose={() => setShowMealPlanModal(false)}
                    onConfirm={handleMealPlanConfirm}
                    recipe={recipe}
                />
            )}

            {/* Notification Component */}
            <Notification
                message={notification.message}
                type={notification.type}
                duration={4000}
                onClose={handleCloseNotification}
            />
        </div>
    );
};

export default RecipeDetail;