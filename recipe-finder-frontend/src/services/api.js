const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const THEMEALDB_API_KEY = '1'; // Public key for TheMealDB
const THEMEALDB_BASE_URL = `https://www.themealdb.com/api/json/v1/${THEMEALDB_API_KEY}`;

// Recipe API calls
export const recipeService = {
    // --- Backend calls for general recipe functionality ---
    searchByIngredients: async (ingredients, number = 12) => {
        const params = new URLSearchParams({
            ingredients,
            number: number.toString()
        });
        console.log(`[recipeService.searchByIngredients] Fetching: ${API_URL}/api/recipes/search?${params}`);
        const response = await fetch(`${API_URL}/api/recipes/search?${params}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[recipeService.searchByIngredients] API Error:', response.status, errorText);
            throw new Error('Failed to search recipes by ingredients via backend');
        }
        return response.json();
    },

    complexSearch: async (query, options = {}) => {
        const params = new URLSearchParams();
        if (query) params.append('query', query);
        if (options.number) params.append('number', options.number.toString());
        if (options.cuisine) params.append('cuisine', options.cuisine);
        if (options.diet) params.append('diet', options.diet);
        if (options.category) params.append('category', options.category);
        if (options.area) params.append('area', options.area);

        console.log(`[recipeService.complexSearch] Fetching: ${API_URL}/api/recipes/complex-search?${params}`);

        try {
            const response = await fetch(`${API_URL}/api/recipes/complex-search?${params}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[recipeService.complexSearch] API Error:', response.status, errorText);
                throw new Error('Failed to perform complex recipe search via backend');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error in complexSearch:', error);
            // Return a consistent structure even on error
            return {
                results: [],
                totalResults: 0
            };
        }
    },

    getRecipeDetails: async (id) => {
        if (!id) {
            console.error("[recipeService.getRecipeDetails] ID is undefined.");
            throw new Error("Recipe ID is required.");
        }
        console.log(`[recipeService.getRecipeDetails] Fetching: ${API_URL}/api/recipes/${id}`);
        const response = await fetch(`${API_URL}/api/recipes/${id}`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[recipeService.getRecipeDetails] API Error:', response.status, errorText, `ID: ${id}`);
            if (response.status === 404) throw new Error(`Recipe with ID ${id} not found via backend.`);
            throw new Error('Failed to get recipe details via backend');
        }
        const data = await response.json();
        // Handle if backend proxies TheMealDB structure {meals: [recipe]}
        if (data && data.meals && data.meals.length > 0) {
            return data.meals[0];
        }
        return data;
    },

    // --- Direct TheMealDB calls for dropdowns and specific searches ---
    getTheMealDBCategories: async () => {
        console.log(`[recipeService.getTheMealDBCategories] Fetching categories directly from TheMealDB`);
        const response = await fetch(`${THEMEALDB_BASE_URL}/list.php?c=list`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[recipeService.getTheMealDBCategories] API Error:', response.status, errorText);
            throw new Error('Failed to get TheMealDB categories');
        }
        const data = await response.json();
        return data.meals || [];
    },

    getTheMealDBAreas: async () => {
        console.log(`[recipeService.getTheMealDBAreas] Fetching areas directly from TheMealDB`);
        const response = await fetch(`${THEMEALDB_BASE_URL}/list.php?a=list`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[recipeService.getTheMealDBAreas] API Error:', response.status, errorText);
            throw new Error('Failed to get TheMealDB areas');
        }
        const data = await response.json();
        return data.meals || [];
    },

    searchTheMealDB: async (query, options = {}) => {
        // Create query parameters object
        const params = new URLSearchParams();

        // Add all parameters (will use them all, not just one)
        if (query && query.trim() !== "") {
            params.append('query', query.trim());
        }

        if (options.category && options.category !== "any category" && options.category !== "") {
            params.append('category', options.category);
        }

        if (options.area && options.area !== "any cuisine" && options.area !== "") {
            params.append('area', options.area);
        }

        // Optional: pass number parameter
        if (options.number) {
            params.append('number', options.number.toString());
        }

        // Check if we have any search criteria
        if (params.toString() === "") {
            console.warn("[recipeService.searchTheMealDB] No valid TheMealDB search criteria provided. Returning empty.");
            return { meals: [], primaryFilterType: '' };
        }

        console.log(`[recipeService.searchTheMealDB] Searching with params: ${params.toString()}`);

        try {
            // Send all parameters to the backend endpoint
            const response = await fetch(`${API_URL}/api/recipes/complex-search?${params}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[recipeService.searchTheMealDB] API Error:', response.status, errorText);
                throw new Error('Failed to search TheMealDB');
            }

            const data = await response.json();
            return {
                meals: data.results || [],
                totalResults: data.totalResults,
                appliedFilters: data.appliedFilters
            };
        } catch (error) {
            console.error("Error in searchTheMealDB service:", error);
            return {
                meals: [],
                error: error.message,
                appliedFilters: {
                    query: query || null,
                    category: options.category || null,
                    area: options.area || null
                }
            };
        }
    },

    getTheMealDBRecipeDetails: async (idMeal) => {
        if (!idMeal) {
            console.error("[recipeService.getTheMealDBRecipeDetails] idMeal is undefined.");
            throw new Error("Meal ID (idMeal) is required for TheMealDB details.");
        }
        console.log(`[recipeService.getTheMealDBRecipeDetails] Fetching details for idMeal: ${idMeal}`);
        const response = await fetch(`${THEMEALDB_BASE_URL}/lookup.php?i=${idMeal}`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[recipeService.getTheMealDBRecipeDetails] API Error:', response.status, errorText);
            throw new Error('Failed to get TheMealDB recipe details');
        }
        const data = await response.json();
        return data.meals && data.meals.length > 0 ? data.meals[0] : null;
    },

    searchByPrimaryIngredientTheMealDB: async (ingredientsString) => {
        const ingredientsArray = ingredientsString.toLowerCase().split(',').map(ing => ing.trim()).filter(ing => ing);

        if (ingredientsArray.length === 0) {
            console.warn("[recipeService.searchByPrimaryIngredientTheMealDB] No valid ingredients provided.");
            return { meals: [] };
        }

        const primaryIngredient = ingredientsArray[0];
        console.log(`[recipeService.searchByPrimaryIngredientTheMealDB] Fetching by primary ingredient: ${primaryIngredient}`);

        const response = await fetch(`${THEMEALDB_BASE_URL}/filter.php?i=${encodeURIComponent(primaryIngredient)}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[recipeService.searchByPrimaryIngredientTheMealDB] API Error:', response.status, errorText);
            throw new Error('Failed to search recipes by primary ingredient using TheMealDB');
        }
        const data = await response.json();
        return data;
    }
};

// --- Favorites API calls (to YOUR backend) ---
export const favoritesService = {
    getFavorites: async (userId, options = {}) => {
        if (!userId) {
            console.warn('[favoritesService.getFavorites] userId missing.');
            return [];
        }

        // Add query parameters for optimization
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.since) params.append('since', options.since);

        const url = `${API_URL}/api/favorites/${userId}${params.toString() ? '?' + params.toString() : ''}`;
        console.log(`[favoritesService.getFavorites] Fetching: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) return [];
            const errorText = await response.text();
            console.error('[favoritesService.getFavorites] API Error:', response.status, errorText);
            throw new Error('Failed to get favorites');
        }
        return response.json();
    },

    addFavorite: async (userId, recipeId, recipeData) => {
        console.log(`[favoritesService.addFavorite] Adding: userId=${userId}, recipeId=${recipeId}, title=${recipeData.title || recipeData.strMeal}`);
        const response = await fetch(`${API_URL}/api/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, recipeId, recipeData })
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[favoritesService.addFavorite] API Error:', response.status, errorText);
            throw new Error('Failed to add to favorites');
        }
        return response.json();
    },

    removeFavorite: async (userId, recipeId) => {
        console.log(`[favoritesService.removeFavorite] Removing: userId=${userId}, recipeId=${recipeId}`);
        const response = await fetch(`${API_URL}/api/favorites/${userId}/${recipeId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[favoritesService.removeFavorite] API Error:', response.status, errorText);
            throw new Error('Failed to remove from favorites');
        }
        return response.json();
    },

    // New: Check single recipe favorite status
    checkFavorite: async (userId, recipeId) => {
        console.log(`[favoritesService.checkFavorite] Checking: userId=${userId}, recipeId=${recipeId}`);
        const response = await fetch(`${API_URL}/api/favorites/${userId}/${recipeId}/check`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[favoritesService.checkFavorite] API Error:', response.status, errorText);
            throw new Error('Failed to check favorite status');
        }
        return response.json();
    },

    // New: Batch check multiple recipes
    batchCheckFavorites: async (userId, recipeIds) => {
        console.log(`[favoritesService.batchCheckFavorites] Batch checking ${recipeIds.length} recipes for user ${userId}`);
        const response = await fetch(`${API_URL}/api/favorites/${userId}/batch-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipeIds })
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[favoritesService.batchCheckFavorites] API Error:', response.status, errorText);
            throw new Error('Failed to batch check favorites');
        }
        return response.json();
    }
};

// --- Meal plan API calls (to YOUR backend) ---
export const mealPlanService = {
    getMealPlan: async (userId, options = {}) => {
        if (!userId) {
            console.warn('[mealPlanService.getMealPlan] userId missing.');
            return [];
        }

        const params = new URLSearchParams();
        if (options.startDate) params.append('startDate', options.startDate);
        if (options.endDate) params.append('endDate', options.endDate);
        if (options.limit) params.append('limit', options.limit.toString());

        const url = `${API_URL}/api/meal-plan/${userId}${params.toString() ? '?' + params.toString() : ''}`;
        console.log(`[mealPlanService.getMealPlan] Fetching: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) return [];
            const errorText = await response.text();
            console.error('[mealPlanService.getMealPlan] API Error:', response.status, errorText);
            throw new Error('Failed to get meal plan');
        }
        return response.json();
    },

    addToMealPlan: async (userId, date, mealType, recipeData) => {
        console.log(`[mealPlanService.addToMealPlan] Adding: userId=${userId}, date=${date}, mealType=${mealType}, title=${recipeData.title || recipeData.strMeal}`);
        const response = await fetch(`${API_URL}/api/meal-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, date, mealType, recipeData })
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[mealPlanService.addToMealPlan] API Error:', response.status, errorText);
            throw new Error('Failed to add to meal plan');
        }
        return response.json();
    },

    // New function to remove a meal from the plan
    removeMealFromPlan: async (userId, mealId) => {
        if (!userId || !mealId) {
            console.error('[mealPlanService.removeMealFromPlan] userId or mealId missing.');
            throw new Error('User ID and Meal ID are required to remove a meal from the plan.');
        }
        console.log(`[mealPlanService.removeMealFromPlan] Removing: userId=${userId}, mealId=${mealId}`);
        const response = await fetch(`${API_URL}/api/meal-plan/${userId}/${mealId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[mealPlanService.removeMealFromPlan] API Error:', response.status, errorText);
            throw new Error('Failed to remove meal from plan');
        }
        // Check if the response has content before trying to parse as JSON
        const responseText = await response.text();
        try {
            return responseText ? JSON.parse(responseText) : {}; // Return empty object for empty successful DELETE
        } catch (e) {
            console.warn('[mealPlanService.removeMealFromPlan] Response was not valid JSON, returning raw text or empty object.', responseText);
            return {}; // Or handle as appropriate if backend sends specific non-JSON success messages
        }
    }
};