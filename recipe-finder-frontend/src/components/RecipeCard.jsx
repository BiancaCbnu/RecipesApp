// src/components/RecipeCard.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useFavorites } from '../contexts/FavoritesContext.jsx';
import { mealPlanService } from '../services/api.js';
import FavoriteModal from './FavoriteModal.jsx';
import MealPlanModal from './MealPlanModal.jsx';
import '../styles/RecipeCard.css';

// Add hideFavoriteButton prop with default value false
const RecipeCard = ({ recipe, showIngredients = false, onFavoriteChange, hideFavoriteButton = false }) => {
    const { currentUser } = useAuth();
    const { isFavorited, addFavorite, removeFavorite } = useFavorites();
    const [showFavoriteModal, setShowFavoriteModal] = useState(false);
    const [showMealPlanModal, setShowMealPlanModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const recipeId = recipe.id || recipe.idMeal;
    const title = recipe.title || recipe.strMeal || "Recipe Title";
    const image = recipe.image || recipe.strMealThumb || `https://via.placeholder.com/300x200.png?text=${encodeURIComponent(title)}`;
    const readyInMinutes = recipe.readyInMinutes;
    const servings = recipe.servings;

    const isCurrentlyFavorited = isFavorited(recipeId);

    const handleFavoriteClick = async () => {
        if (!currentUser) {
            alert('Please log in to manage favorites.');
            return;
        }
        if (!recipeId) {
            const errMsg = 'Error: Recipe data is incomplete for favoriting.';
            if (onFavoriteChange) onFavoriteChange({ success: false, message: errMsg, action: 'favoriteError' });
            else alert(errMsg);
            return;
        }

        setActionLoading(true);
        try {
            let result;
            if (isCurrentlyFavorited) {
                result = await removeFavorite(recipeId);
                result.action = 'favoriteRemoved';
            } else {
                const recipeDataForFavorite = {
                    id: recipeId,
                    title: title,
                    image: image,
                    ...(readyInMinutes !== undefined && { readyInMinutes }),
                    ...(servings !== undefined && { servings }),
                    category: recipe.category || recipe.strCategory || (recipe.dishTypes?.[0]),
                    area: recipe.area || recipe.strArea || (recipe.cuisines?.[0]),
                    dateAdded: new Date().toISOString()
                };
                result = await addFavorite(recipeId, recipeDataForFavorite);
                result.action = 'favoriteAdded';
            }

            if (onFavoriteChange) {
                onFavoriteChange(result);
            }
        } catch (error) {
            console.error("Error toggling favorite from RecipeCard:", error);
            const errorResult = {
                success: false,
                message: `Failed to update favorites for "${title}".`,
                action: 'favoriteError'
            };

            if (onFavoriteChange) {
                onFavoriteChange(errorResult);
            } else {
                alert(errorResult.message);
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleMealPlanClick = () => {
        if (!currentUser || !recipeId) {
            alert('Please log in to add to meal plan.');
            return;
        }
        setShowMealPlanModal(true);
    };

    const handleMealPlanConfirm = async (date, mealType) => {
        if (!currentUser || !recipeId) {
            alert('Error: User or recipe data missing for meal plan.');
            if (onFavoriteChange) {
                onFavoriteChange({ success: false, message: 'User or recipe data missing.', action: 'mealPlanSetupError' });
            }
            setShowMealPlanModal(false);
            return;
        }

        const recipeDataForMealPlan = {
            id: recipeId,
            title: title,
            image: image,
            ...(readyInMinutes !== undefined && { readyInMinutes }),
            ...(servings !== undefined && { servings }),
        };

        let success = false;
        let message = '';
        let action = 'mealPlanError';

        try {
            setActionLoading(true);
            await mealPlanService.addToMealPlan(currentUser.uid, date, mealType, recipeDataForMealPlan);
            success = true;
            action = 'mealPlanAdded';
            message = `"${title}" added to meal plan for ${date} (${mealType})!`;
        } catch (error) {
            console.error('Error adding to meal plan from RecipeCard:', error);
            success = false;
            message = `Failed to add "${title}" to meal plan. Please try again.`;
        } finally {
            setActionLoading(false);
            setShowMealPlanModal(false);
            if (onFavoriteChange) {
                onFavoriteChange({ success, message, action });
            } else {
                alert(message);
            }
        }
    };

    // Helper functions remain the same
    const getCategoryTag = (recipeData) => {
        if (!recipeData) return null;
        if (recipeData.category) return recipeData.category;
        if (recipeData.strCategory) return recipeData.strCategory;
        if (recipeData.dishTypes && recipeData.dishTypes.length > 0) return recipeData.dishTypes[0];
        if (recipeData.vegetarian && !recipeData.vegan) return "Vegetarian";
        if (recipeData.vegan) return "Vegan";
        return null;
    };

    const getOriginDescription = (recipeData) => {
        if (!recipeData) return title;
        const baseTitle = title;
        const area = recipeData.area || recipeData.strArea;
        const cuisines = recipeData.cuisines;

        if (area) return `${baseTitle} from ${area} cuisine`;
        if (cuisines && cuisines.length > 0) return `${baseTitle} from ${cuisines[0]} cuisine`;

        if (recipeData.summary && typeof recipeData.summary === 'string') {
            const strippedSummary = recipeData.summary.replace(/<[^>]+>/g, '');
            const firstSentence = strippedSummary.split('.')[0];
            if (firstSentence && firstSentence.length < 80 && firstSentence.length > 5) return firstSentence.trim() + ".";
        }
        return baseTitle;
    };

    const categoryTagText = getCategoryTag(recipe);
    const originDescriptionText = getOriginDescription(recipe);

    const hasUsedIngredients = recipe.usedIngredients && recipe.usedIngredients.length > 0;
    const hasMissedIngredients = recipe.missedIngredients && recipe.missedIngredients.length > 0;
    const displayIngredientsInfo = showIngredients && (hasUsedIngredients || hasMissedIngredients);

    return (
        <div className="recipe-card">
            <div className="recipe-image-container">
                <img src={image} alt={title} className="recipe-image" />
                <div className="recipe-actions">
                    {/* Only show favorite button if hideFavoriteButton is false */}
                    {!hideFavoriteButton && (
                        <button
                            onClick={handleFavoriteClick}
                            className={`favorite-btn ${isCurrentlyFavorited ? 'favorited' : ''}`}
                            disabled={actionLoading || !currentUser}
                            title={isCurrentlyFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            {actionLoading ? '⏳' : (isCurrentlyFavorited ? '❤️' : '🤍')}
                        </button>
                    )}
                    <button
                        onClick={handleMealPlanClick}
                        className="meal-plan-btn"
                        title="Add to meal plan"
                        disabled={!currentUser || actionLoading}
                    >
                        📅
                    </button>
                </div>
            </div>

            <div className="recipe-content">
                <h3 className="recipe-title">{title}</h3>

                <div className="recipe-meta">
                    {readyInMinutes !== undefined && (
                        <span className="meta-item">⏱️ {readyInMinutes} min</span>
                    )}
                    {servings !== undefined && (
                        <span className="meta-item">👥 {servings} servings</span>
                    )}
                </div>

                <div className={`recipe-description-block ${displayIngredientsInfo ? 'showing-ingredients' : ''}`}>
                    {displayIngredientsInfo ? (
                        <div className="used-ingredients">
                            {hasUsedIngredients && (
                                <p><strong className="uses-label">Uses:</strong> {recipe.usedIngredients.map(ing => ing.name || ing).join(', ')}</p>
                            )}
                            {hasMissedIngredients && (
                                <p><strong className="missing-label">Missing:</strong> {recipe.missedIngredients.map(ing => ing.name || ing).join(', ')}</p>
                            )}
                        </div>
                    ) : (
                        <div className="recipe-origin">
                            {originDescriptionText}
                        </div>
                    )}

                    {categoryTagText && (
                        <span className="recipe-category-tag">
                            {categoryTagText}
                        </span>
                    )}
                </div>

                <Link to={`/recipe/${recipeId}`} className="view-recipe-btn">
                    View Recipe
                </Link>
            </div>

            {currentUser && (
                <>
                    <FavoriteModal
                        isOpen={showFavoriteModal}
                        onClose={() => setShowFavoriteModal(false)}
                        onConfirm={() => {
                            console.log("Favorite Modal Confirmed");
                            setShowFavoriteModal(false);
                        }}
                        recipe={recipe}
                    />
                    <MealPlanModal
                        isOpen={showMealPlanModal}
                        onClose={() => setShowMealPlanModal(false)}
                        onConfirm={handleMealPlanConfirm}
                        recipe={recipe}
                    />
                </>
            )}
        </div>
    );
};

export default RecipeCard;