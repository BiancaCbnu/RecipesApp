import React, { useState, useEffect } from 'react';
import { recipeService } from '../services/api.js'; // Ensure this path is correct
import RecipeCard from '../components/RecipeCard.jsx'; // Ensure this path is correct
import Notification from '../components/Notification.jsx'; // Added Notification import
import '../styles/RecipeSearch.css'; // Ensure this path is correct

const RecipeSearch = () => {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState(''); // For recipe name input
    const [ingredientsQuery, setIngredientsQuery] = useState(''); // For user's raw comma-separated ingredient input
    const [searchType, setSearchType] = useState('query');

    const [categoryOptions, setCategoryOptions] = useState([]); // Populated from TheMealDB strCategory
    const [cuisineOptions, setCuisineOptions] = useState([]);   // Populated from TheMealDB strArea

    const [selectedCategory, setSelectedCategory] = useState(''); // Value for TheMealDB category filter (c=)
    const [selectedCuisine, setSelectedCuisine] = useState('');   // Value for TheMealDB area filter (a=)

    const [searchedOnce, setSearchedOnce] = useState(false);
    const [initialFiltersLoading, setInitialFiltersLoading] = useState(true);

    // Added notification state
    const [notification, setNotification] = useState({ message: '', type: '' });

    useEffect(() => {
        const fetchFilterOptions = async () => {
            setInitialFiltersLoading(true);
            try {
                const [categoriesData, areasData] = await Promise.all([
                    recipeService.getTheMealDBCategories(),
                    recipeService.getTheMealDBAreas()
                ]);
                setCategoryOptions(['Any Category', ...categoriesData.map(c => c.strCategory).sort()]);
                setCuisineOptions(['Any Cuisine', ...areasData.map(a => a.strArea).sort()]);
            } catch (error) {
                console.error("Failed to load filter options:", error);
                setCategoryOptions(['Any Category']);
                setCuisineOptions(['Any Cuisine']);
            } finally {
                setInitialFiltersLoading(false);
            }
        };
        fetchFilterOptions();
    }, []); // Run once on mount

    // Helper to parse all ingredients from a TheMealDB recipe object (returns a Set of lowercase strings)
    const getAllIngredientsFromMealDBRecipe = (meal) => {
        const ingredientsSet = new Set();
        if (!meal) return ingredientsSet;
        for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`];
            if (ingredient && ingredient.trim() !== "") {
                ingredientsSet.add(ingredient.toLowerCase().trim());
            }
        }
        return ingredientsSet;
    };

    const searchRecipes = async () => {
        console.log("[SearchRecipes] Initiating search...");
        const isQuerySearch = searchType === 'query';
        const isIngredientSearch = searchType === 'ingredients';

        // Validation
        if (isQuerySearch && !searchQuery.trim() && !selectedCategory && !selectedCuisine) {
            alert('Please enter a recipe name or select a category/cuisine.');
            return;
        }
        if (isIngredientSearch && !ingredientsQuery.trim()) {
            alert('Please enter ingredients.');
            return;
        }

        setLoading(true);
        setRecipes([]); // Clear previous results
        setSearchedOnce(true);

        try {
            let finalRecipesToDisplay = [];

            if (isIngredientSearch) {
                // Ingredient search remains the same as before
                const searchedIngredients = ingredientsQuery.toLowerCase().split(',')
                    .map(s => s.trim()).filter(s => s);

                if (searchedIngredients.length === 0) {
                    alert("Please enter valid ingredients to search.");
                    setLoading(false);
                    return;
                }

                // Step 1: Fetch initial list based on the FIRST ingredient using searchByPrimaryIngredientTheMealDB
                const initialData = await recipeService.searchByPrimaryIngredientTheMealDB(searchedIngredients[0]);
                const mealSummaries = initialData.meals || [];

                if (mealSummaries.length === 0) {
                    console.log(`[SearchRecipes] No initial recipes found for primary ingredient "${searchedIngredients[0]}"`);
                    setRecipes([]); // Ensure recipes state is empty
                } else {
                    console.log(`[SearchRecipes] Found ${mealSummaries.length} potential recipes for primary ingredient "${searchedIngredients[0]}"`);

                    // Step 2: Fetch full details for each summary
                    const detailPromises = mealSummaries.map(summary =>
                        recipeService.getTheMealDBRecipeDetails(summary.idMeal)
                            .catch(e => {
                                console.warn(`Failed to fetch details for ${summary.idMeal}`, e);
                                return null;
                            })
                    );
                    const detailedRecipes = (await Promise.all(detailPromises)).filter(Boolean);
                    console.log(`[SearchRecipes] Fetched details for ${detailedRecipes.length} recipes.`);

                    // Step 3: Filter these detailed recipes to ensure they contain ALL searched ingredients
                    // And construct used/missed based on the user's full query
                    finalRecipesToDisplay = detailedRecipes.filter(fullRecipe => {
                        if (!fullRecipe) return false;
                        const recipeActualIngredientsSet = getAllIngredientsFromMealDBRecipe(fullRecipe);
                        return searchedIngredients.every(searchedIng => recipeActualIngredientsSet.has(searchedIng));
                    }).map(fullRecipe => {
                        const currentUsedIngredients = searchedIngredients.map(searchedIng => ({ name: searchedIng }));
                        // Since we filtered by .every(), missedIngredients based on the query will be empty.
                        const currentMissedIngredients = [];

                        return {
                            ...fullRecipe,
                            usedIngredients: currentUsedIngredients,
                            missedIngredients: currentMissedIngredients,
                        };
                    });
                    console.log(`[SearchRecipes] Final filtered recipes by ingredients: ${finalRecipesToDisplay.length}`);
                }
            } else { // Query Search (name, category, or area/cuisine filters)
                // UPDATED: Simplified approach passing all parameters at once
                const apiOptions = {
                    category: selectedCategory === 'Any Category' ? '' : selectedCategory,
                    area: selectedCuisine === 'Any Cuisine' ? '' : selectedCuisine,
                    number: 24 // Slightly increased to account for filtering
                };

                console.log("[SearchRecipes] Running combined search:", {
                    query: searchQuery,
                    category: apiOptions.category,
                    area: apiOptions.area
                });

                // This will now use our improved backend that handles combined filtering
                const searchResult = await recipeService.searchTheMealDB(searchQuery, apiOptions);
                finalRecipesToDisplay = searchResult.meals || [];

                console.log(`[SearchRecipes] Combined search returned ${finalRecipesToDisplay.length} recipes`);
            }
            setRecipes(finalRecipesToDisplay);

        } catch (error) {
            console.error('Error in searchRecipes:', error);
            alert('An error occurred while searching. Please try again.');
            setRecipes([]); // Ensure recipes are cleared on error
        } finally {
            console.log("[SearchRecipes] Search complete, setting loading to false.");
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        searchRecipes();
    };

    // Added handler for meal plan additions
    const handleMealPlanChange = (status) => {
        if (status.success) {
            setNotification({ message: status.message || 'Recipe added to meal plan!', type: 'success' });
        } else {
            setNotification({ message: status.message || 'Failed to add to meal plan.', type: 'error' });
        }
    };

    // Added handler for favorite changes to match the Home component
    const handleFavoriteChange = (status) => {
        if (status.success) {
            setNotification({ message: status.message, type: 'success' });
        } else {
            setNotification({ message: status.message || 'An error occurred.', type: 'error' });
        }
    };

    // Added handler to close notification
    const handleCloseNotification = () => {
        setNotification({ message: '', type: '' });
    };

    if (initialFiltersLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading search options...</p>
            </div>
        );
    }

    return (
        <div className="recipe-search">
            <div className="search-header">
                <h1>Find Your Perfect Recipe</h1>
                <p>Search by name, category, cuisine, or ingredients</p>
            </div>

            <form onSubmit={handleSubmit} className="search-form">
                <div className="search-type-selector">
                    <label>
                        <input type="radio" value="query" checked={searchType === 'query'} onChange={(e) => setSearchType(e.target.value)} />
                        Search by Name / Filters
                    </label>
                    <label>
                        <input type="radio" value="ingredients" checked={searchType === 'ingredients'} onChange={(e) => setSearchType(e.target.value)} />
                        Search by My Ingredients
                    </label>
                </div>

                {searchType === 'query' ? (
                    <div className="search-group">
                        <input
                            type="text"
                            placeholder="e.g., Chicken, Arrabiata (optional)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                        <div className="filters">
                            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="filter-select" title="Select Category">
                                {categoryOptions.map((option, index) => (
                                    <option key={`cat-${index}`} value={index === 0 ? "" : option}>{option}</option>
                                ))}
                            </select>
                            <select value={selectedCuisine} onChange={(e) => setSelectedCuisine(e.target.value)} className="filter-select" title="Select Cuisine (Area)">
                                {cuisineOptions.map((option, index) => (
                                    <option key={`area-${index}`} value={index === 0 ? "" : option}>{option}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="search-group">
                        <input
                            type="text"
                            placeholder="e.g., chicken, onion, garlic (comma separated)"
                            value={ingredientsQuery}
                            onChange={(e) => setIngredientsQuery(e.target.value)}
                            className="search-input"
                        />
                        <small>Enter all ingredients you have. Results will show recipes containing all of them.</small>
                    </div>
                )}
                <button type="submit" className={`search-button ${loading ? 'loading' : ''}`} disabled={loading || initialFiltersLoading}>
                    {loading ? '' : 'Search Recipes'}
                </button>
            </form>

            {!loading && searchedOnce && recipes.length === 0 && (
                <div className="search-results no-results">
                    <h2>No recipes found.</h2>
                    <p>Try different search terms or filters.</p>
                </div>
            )}
            {recipes.length > 0 && (
                <div className="search-results">
                    <h2>Found {recipes.length} recipes</h2>
                    <div className="recipes-grid">
                        {recipes.map(recipe => (
                            <RecipeCard
                                key={recipe.idMeal || recipe.id || Math.random()} // Use idMeal for TheMealDB
                                recipe={recipe} // This recipe object is now potentially enriched
                                // showIngredients if it's an ingredient search and the recipe has calculated these fields
                                showIngredients={searchType === 'ingredients' && !!(recipe.usedIngredients || recipe.missedIngredients)}
                                onFavoriteChange={handleFavoriteChange}
                                onMealPlanChange={handleMealPlanChange}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Add Notification component */}
            <Notification
                message={notification.message}
                type={notification.type}
                duration={3000}
                onClose={handleCloseNotification}
            />
        </div>
    );
};

export default RecipeSearch;