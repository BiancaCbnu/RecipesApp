const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// Firebase Admin SDK
const admin = require('firebase-admin');

let serviceAccount;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        // Production: use environment variable
        const serviceAccountJSON = Buffer.from(
            process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
            'base64'
        ).toString();
        serviceAccount = JSON.parse(serviceAccountJSON);
        console.log('✅ Loaded Firebase credentials from environment variable');
    } else {
        // Development: load from file
        serviceAccount = require('./firebase-service-account.json');
        console.log('✅ Loaded Firebase credentials from local file');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    // Try alternative initialization with just project ID
    try {
        admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID
        });
        console.log('✅ Firebase initialized with Project ID fallback');
    } catch (fallbackError) {
        console.error('❌ Complete Firebase initialization failure:', fallbackError.message);
    }
}

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 5000;

// TheMealDB API configuration (Free API - no key needed!)
const MEALDB_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

// Middleware
app.use(cors());
app.use(express.json());

// Test Firebase connection on startup
(async () => {
    try {
        await db.collection('_test').limit(1).get();
        console.log('✅ Firebase connection successful!');
    } catch (error) {
        console.error('❌ Firebase connection failed:', error.message);
    }
})();

// Routes

// Search recipes by name (replaces complex search)
app.get('/api/recipes/complex-search', async (req, res) => {
    try {
        const { query, category, area, number = 12 } = req.query;

        console.log('Complex search:', { query, category, area, number });

        // Track what API calls we need to make
        const apiCalls = [];
        let meals = [];

        // STEP 1: Determine which API call(s) to make
        if (query && query.trim() !== '') {
            // Always include text search if provided
            apiCalls.push({
                type: 'name',
                url: `${MEALDB_BASE_URL}/search.php?s=${encodeURIComponent(query.trim())}`
            });
        }

        if (category && category !== 'Any Category' && category !== '') {
            apiCalls.push({
                type: 'category',
                url: `${MEALDB_BASE_URL}/filter.php?c=${encodeURIComponent(category)}`
            });
        }

        if (area && area !== 'Any Cuisine' && area !== '') {
            apiCalls.push({
                type: 'area',
                url: `${MEALDB_BASE_URL}/filter.php?a=${encodeURIComponent(area)}`
            });
        }

        // STEP 2: Handle special case - no filters specified
        if (apiCalls.length === 0 || (query === 'popular')) {
            // No criteria or 'popular' query - get random recipes
            console.log('Getting random/popular recipes');
            const randomPromises = [];
            for (let i = 0; i < Math.min(parseInt(number), 12); i++) {
                randomPromises.push(axios.get(`${MEALDB_BASE_URL}/random.php`));
            }
            const randomResponses = await Promise.all(randomPromises);
            meals = randomResponses.map(r => r.data.meals[0]).filter(meal => meal);
        }
        // STEP 3: Handle single filter case (simple)
        else if (apiCalls.length === 1) {
            const response = await axios.get(apiCalls[0].url);
            meals = response.data.meals || [];
        }
        // STEP 4: Handle multiple filters (need to combine results)
        else {
            // Make all API calls in parallel
            const responses = await Promise.all(apiCalls.map(call => axios.get(call.url)));

            // Get the results from each API call
            const resultSets = responses.map((response, index) => {
                const meals = response.data.meals || [];
                return {
                    type: apiCalls[index].type,
                    meals: meals,
                    idSet: new Set(meals.map(meal => meal.idMeal))
                };
            });

            // Handle case where any API returns no results (intersection would be empty)
            if (resultSets.some(set => set.meals.length === 0)) {
                meals = []; // Empty result if any filter returns nothing
            } else {
                // STEP 5: Find the intersection of all result sets based on meal IDs
                // Start with the smallest result set to optimize
                resultSets.sort((a, b) => a.meals.length - b.meals.length);

                // Use first result set as base
                const baseResults = resultSets[0].meals;
                const matchingIds = baseResults
                    .filter(meal => resultSets.every(set => set.idSet.has(meal.idMeal)))
                    .map(meal => meal.idMeal);

                // If we have name search results, prioritize those for full details
                const nameResults = resultSets.find(set => set.type === 'name');

                if (nameResults) {
                    // We already have full meal details from name search
                    meals = nameResults.meals.filter(meal => matchingIds.includes(meal.idMeal));
                } else {
                    // Need to get full details for each matching ID (from first result set)
                    meals = baseResults.filter(meal => matchingIds.includes(meal.idMeal));

                    // If using summary meals from category/area, we need to fetch details
                    if (apiCalls.every(call => call.type !== 'name') && meals.length > 0) {
                        // Get full details for limited number of meals
                        const detailedMeals = [];
                        const detailPromises = meals.slice(0, parseInt(number))
                            .map(meal => axios.get(`${MEALDB_BASE_URL}/lookup.php?i=${meal.idMeal}`));

                        const detailResponses = await Promise.all(detailPromises);
                        for (const response of detailResponses) {
                            if (response.data.meals && response.data.meals.length > 0) {
                                detailedMeals.push(response.data.meals[0]);
                            }
                        }
                        meals = detailedMeals;
                    }
                }
            }
        }

        // STEP 6: Transform meals into the expected format & limit results
        const transformedMeals = meals.slice(0, parseInt(number)).map(meal => ({
            id: parseInt(meal.idMeal),
            title: meal.strMeal,
            image: meal.strMealThumb,
            readyInMinutes: 30, // MealDB doesn't provide this, so we'll use a default
            servings: 4, // Default serving size
            summary: `${meal.strMeal}${meal.strArea ? ` from ${meal.strArea} cuisine` : ''}${meal.strCategory ? `. Category: ${meal.strCategory}` : ''}`,
            category: meal.strCategory,
            area: meal.strArea,
            instructions: meal.strInstructions,
            youtube: meal.strYoutube,
            source: meal.strSource
        }));

        res.json({
            results: transformedMeals,
            totalResults: transformedMeals.length,
            appliedFilters: {
                query: query || null,
                category: category || null,
                area: area || null
            }
        });
    } catch (error) {
        console.error('Error searching recipes:', error.message);
        res.status(500).json({ error: 'Failed to search recipes', details: error.message });
    }
});

// Search recipes by ingredients (uses TheMealDB ingredient search)
app.get('/api/recipes/search', async (req, res) => {
    try {
        const { ingredients, number = 12 } = req.query;

        console.log('Searching by ingredients:', ingredients);

        // Split ingredients and search for first one (MealDB limitation)
        const ingredientList = ingredients.split(',').map(ing => ing.trim());
        const mainIngredient = ingredientList[0];

        const response = await axios.get(`${MEALDB_BASE_URL}/filter.php?i=${mainIngredient}`);
        const meals = response.data.meals || [];

        // Transform and limit results
        const transformedMeals = meals.slice(0, parseInt(number)).map(meal => ({
            id: parseInt(meal.idMeal),
            title: meal.strMeal,
            image: meal.strMealThumb,
            readyInMinutes: 30,
            servings: 4,
            usedIngredients: [{ name: mainIngredient }],
            missedIngredients: ingredientList.slice(1).map(ing => ({ name: ing }))
        }));

        res.json(transformedMeals);
    } catch (error) {
        console.error('Error searching recipes by ingredients:', error.message);
        res.status(500).json({ error: 'Failed to search recipes', details: error.message });
    }
});

// Get recipe details by ID
app.get('/api/recipes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log('Getting recipe details for ID:', id);

        const response = await axios.get(`${MEALDB_BASE_URL}/lookup.php?i=${id}`);
        const meal = response.data.meals?.[0];

        if (!meal) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        // Extract ingredients with measurements
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`];
            const measure = meal[`strMeasure${i}`];

            if (ingredient && ingredient.trim()) {
                ingredients.push({
                    id: i,
                    name: ingredient.trim(),
                    measures: {
                        metric: {
                            amount: measure ? measure.trim() : '',
                            unitShort: ''
                        }
                    }
                });
            }
        }

        // Transform to match frontend expectations
        const transformedMeal = {
            id: parseInt(meal.idMeal),
            title: meal.strMeal,
            image: meal.strMealThumb,
            readyInMinutes: 30, // Default value
            servings: 4, // Default value
            summary: `${meal.strMeal} is a delicious ${meal.strCategory} dish from ${meal.strArea} cuisine.`,
            extendedIngredients: ingredients,
            analyzedInstructions: [{
                steps: meal.strInstructions ?
                    meal.strInstructions.split(/\r\n|\r|\n/).filter(step => step.trim()).map((step, index) => ({
                        number: index + 1,
                        step: step.trim()
                    })) : []
            }],
            nutrition: {
                nutrients: [
                    { name: 'Calories', amount: 250, unit: 'kcal' },
                    { name: 'Protein', amount: 20, unit: 'g' },
                    { name: 'Carbohydrates', amount: 30, unit: 'g' },
                    { name: 'Fat', amount: 10, unit: 'g' },
                    { name: 'Fiber', amount: 5, unit: 'g' },
                    { name: 'Sugar', amount: 8, unit: 'g' }
                ]
            },
            category: meal.strCategory,
            area: meal.strArea,
            youtubeUrl: meal.strYoutube,
            sourceUrl: meal.strSource
        };

        res.json(transformedMeal);
    } catch (error) {
        console.error('Error getting recipe details:', error.message);
        res.status(500).json({ error: 'Failed to get recipe details', details: error.message });
    }
});

// 🔥 OPTIMIZED: Save favorite recipe (uses recipeId as document ID for easier checking)
app.post('/api/favorites', async (req, res) => {
    try {
        const { userId, recipeId, recipeData } = req.body;

        console.log('Saving favorite:', { userId, recipeId, recipeTitle: recipeData?.title });

        // Validate required fields
        if (!userId || !recipeId || !recipeData) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Use the recipeId as the document ID for easy checking later
        await db.collection('users').doc(userId).collection('favorites').doc(recipeId.toString()).set({
            ...recipeData,
            savedAt: admin.firestore.FieldValue.serverTimestamp(),
            // Store the original recipe ID for easy reference
            originalRecipeId: recipeId
        });

        console.log('✅ Successfully saved favorite recipe for user:', userId);
        res.json({ success: true, message: 'Recipe saved to favorites' });
    } catch (error) {
        console.error('❌ Error saving favorite:', error);
        res.status(500).json({
            error: 'Failed to save favorite recipe',
            details: error.message,
            code: error.code
        });
    }
});

// 🔥 OPTIMIZED: Get user's favorite recipes with query optimization
app.get('/api/favorites/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit, since } = req.query; // Add optional query params

        console.log('Getting favorites for user:', userId, { limit, since });

        if (!userId || userId === 'undefined') {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        let query = db.collection('users').doc(userId).collection('favorites');

        // Add query optimizations
        if (since) {
            // Only fetch favorites newer than 'since' timestamp
            query = query.where('savedAt', '>', new Date(since));
        }

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        // Order by savedAt for consistent pagination
        query = query.orderBy('savedAt', 'desc');

        const favoritesSnapshot = await query.get();
        const favorites = [];

        if (favoritesSnapshot.empty) {
            console.log('No favorites found for user:', userId);
            return res.json([]);
        }

        favoritesSnapshot.forEach(doc => {
            favorites.push({
                id: doc.id,
                ...doc.data(),
                savedAt: doc.data().savedAt?.toDate?.() || new Date()
            });
        });

        console.log(`✅ Found ${favorites.length} favorites for user:`, userId);
        res.json(favorites);
    } catch (error) {
        console.error('❌ Error getting favorites:', error);
        res.status(500).json({
            error: 'Failed to get favorite recipes',
            details: error.message,
            userId: req.params.userId
        });
    }
});

// 🆕 NEW: Check if specific recipe is favorited (single document read)
app.get('/api/favorites/:userId/:recipeId/check', async (req, res) => {
    try {
        const { userId, recipeId } = req.params;
        console.log('Checking favorite status:', { userId, recipeId });

        const favoriteDoc = await db.collection('users')
            .doc(userId)
            .collection('favorites')
            .doc(recipeId.toString())
            .get();

        res.json({
            isFavorited: favoriteDoc.exists,
            recipeId: recipeId
        });
    } catch (error) {
        console.error('❌ Error checking favorite status:', error);
        res.status(500).json({
            error: 'Failed to check favorite status',
            details: error.message
        });
    }
});

// 🆕 NEW: Batch check multiple recipes at once
app.post('/api/favorites/:userId/batch-check', async (req, res) => {
    try {
        const { userId } = req.params;
        const { recipeIds } = req.body; // Array of recipe IDs

        if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
            return res.status(400).json({ error: 'recipeIds must be a non-empty array' });
        }

        console.log('Batch checking favorites:', { userId, count: recipeIds.length });

        // Batch read multiple documents
        const favoritesCol = db.collection('users').doc(userId).collection('favorites');
        const promises = recipeIds.map(id => favoritesCol.doc(id.toString()).get());

        const results = await Promise.all(promises);
        const favoriteStatuses = {};

        results.forEach((doc, index) => {
            favoriteStatuses[recipeIds[index]] = doc.exists;
        });

        res.json(favoriteStatuses);
    } catch (error) {
        console.error('❌ Error batch checking favorites:', error);
        res.status(500).json({
            error: 'Failed to batch check favorites',
            details: error.message
        });
    }
});

// Remove favorite recipe
app.delete('/api/favorites/:userId/:recipeId', async (req, res) => {
    try {
        const { userId, recipeId } = req.params;
        console.log('Removing favorite:', { userId, recipeId });

        await db.collection('users').doc(userId).collection('favorites').doc(recipeId.toString()).delete();

        console.log('✅ Successfully removed favorite');
        res.json({ success: true, message: 'Recipe removed from favorites' });
    } catch (error) {
        console.error('❌ Error removing favorite:', error);
        res.status(500).json({
            error: 'Failed to remove favorite recipe',
            details: error.message
        });
    }
});

// Save meal plan
app.post('/api/meal-plan', async (req, res) => {
    try {
        const { userId, date, mealType, recipeData } = req.body;
        console.log('Saving meal plan:', { userId, date, mealType, recipeTitle: recipeData?.title });

        await db.collection('users').doc(userId).collection('mealPlan').add({
            date,
            mealType,
            recipe: recipeData,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Successfully saved meal plan');
        res.json({ success: true, message: 'Recipe added to meal plan' });
    } catch (error) {
        console.error('❌ Error saving meal plan:', error);
        res.status(500).json({
            error: 'Failed to save to meal plan',
            details: error.message
        });
    }
});

// 🔥 OPTIMIZED: Get meal plan with optimized queries
app.get('/api/meal-plan/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate, limit } = req.query;

        console.log('Getting meal plan for user:', userId, { startDate, endDate, limit });

        let query = db.collection('users').doc(userId).collection('mealPlan');

        // Optimized query building
        if (startDate && endDate) {
            query = query.where('date', '>=', startDate).where('date', '<=', endDate);
        } else if (startDate) {
            query = query.where('date', '>=', startDate);
        } else if (endDate) {
            query = query.where('date', '<=', endDate);
        }

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        // Use orderBy only when not using range queries to avoid index requirements
        if (!startDate && !endDate) {
            query = query.orderBy('createdAt', 'desc').limit(parseInt(limit) || 50);
        }

        const mealPlanSnapshot = await query.get();
        const mealPlan = [];

        if (mealPlanSnapshot.empty) {
            console.log('No meal plan found for user:', userId);
            return res.json([]);
        }

        mealPlanSnapshot.forEach(doc => {
            const data = doc.data();
            mealPlan.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                date: data.date || new Date().toISOString().split('T')[0]
            });
        });

        // Sort in memory if we used date filtering
        if (startDate || endDate) {
            mealPlan.sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        console.log(`✅ Found ${mealPlan.length} meal plan items for user:`, userId);
        res.json(mealPlan);
    } catch (error) {
        console.error('❌ Error getting meal plan:', error);
        res.status(500).json({
            error: 'Failed to get meal plan',
            details: error.message,
            userId: req.params.userId
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        api: 'TheMealDB (Free)',
        firebase: 'Connected',
        endpoints: [
            '/api/recipes/complex-search',
            '/api/recipes/search',
            '/api/recipes/:id',
            '/api/favorites/:userId',
            '/api/favorites/:userId/:recipeId/check',
            '/api/favorites/:userId/batch-check',
            '/api/meal-plan/:userId',
            '/api/meal-plan/:userId/:mealId'
        ]
    });
});

// Debug endpoint to test Firebase connection
app.get('/debug/firebase', async (req, res) => {
    try {
        // Test Firebase connection
        const testDoc = await db.collection('_test').limit(1).get();
        res.json({
            firebase: 'Connected',
            projectId: process.env.FIREBASE_PROJECT_ID || 'recipe-finder-dd8a5',
            timestamp: new Date().toISOString(),
            message: '✅ Firebase is working correctly'
        });
    } catch (error) {
        res.status(500).json({
            firebase: 'Error',
            error: error.message,
            projectId: process.env.FIREBASE_PROJECT_ID,
            message: '❌ Firebase connection failed'
        });
    }
});

app.delete('/api/meal-plan/:userId/:mealId', async (req, res) => {
    try {
        const { userId, mealId } = req.params;
        console.log('Removing meal from plan:', { userId, mealId });

        await db.collection('users').doc(userId).collection('mealPlan').doc(mealId).delete();

        console.log('✅ Successfully removed meal from plan');
        res.json({ success: true, message: 'Meal removed from plan' });
    } catch (error) {
        console.error('❌ Error removing meal from plan:', error);
        res.status(500).json({
            error: 'Failed to remove meal from plan',
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Using TheMealDB API (Free)`);
    console.log(`🔥 Firebase Project: ${process.env.FIREBASE_PROJECT_ID || 'recipe-finder-dd8a5'}`);
    console.log(`✅ Ready to accept requests!`);
    console.log(`🔥 OPTIMIZED: Reduced Firebase reads with smart caching and batch operations`);
});