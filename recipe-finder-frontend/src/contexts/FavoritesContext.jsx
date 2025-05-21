// src/contexts/FavoritesContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { favoritesService } from '../services/api.js';

const FavoritesContext = createContext();

export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
};

export const FavoritesProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [favoriteIds, setFavoriteIds] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(0);

    // Cache duration: 5 minutes
    const CACHE_DURATION = 5 * 60 * 1000;

    // Load favorites only once per session or when user changes
    useEffect(() => {
        if (currentUser) {
            loadFavorites();
        } else {
            // Clear favorites when user logs out
            setFavorites([]);
            setFavoriteIds(new Set());
            setLastFetchTime(0);
        }
    }, [currentUser]);

    const loadFavorites = async (forceRefresh = false) => {
        if (!currentUser) return;

        // Check if we have recent data (unless forcing refresh)
        const now = Date.now();
        if (!forceRefresh && now - lastFetchTime < CACHE_DURATION && favorites.length > 0) {
            console.log('Using cached favorites data');
            return;
        }

        try {
            setLoading(true);
            console.log('Fetching favorites from Firebase...');
            const fetchedFavorites = await favoritesService.getFavorites(currentUser.uid);

            setFavorites(fetchedFavorites);
            setFavoriteIds(new Set(fetchedFavorites.map(fav => String(fav.id))));
            setLastFetchTime(now);
        } catch (error) {
            console.error('Error loading favorites:', error);
        } finally {
            setLoading(false);
        }
    };

    const addFavorite = async (recipeId, recipeData) => {
        if (!currentUser || !recipeId) throw new Error('Missing user or recipe ID');

        try {
            // Optimistic update
            const newFavorite = {
                id: String(recipeId),
                ...recipeData,
                dateAdded: new Date().toISOString()
            };

            setFavorites(prev => [newFavorite, ...prev]);
            setFavoriteIds(prev => new Set([...prev, String(recipeId)]));

            // API call
            await favoritesService.addFavorite(currentUser.uid, recipeId, recipeData);

            return { success: true, message: `"${recipeData.title}" added to favorites!` };
        } catch (error) {
            // Revert optimistic update on error
            setFavorites(prev => prev.filter(fav => String(fav.id) !== String(recipeId)));
            setFavoriteIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(String(recipeId));
                return newSet;
            });

            console.error('Error adding favorite:', error);
            throw error;
        }
    };

    const removeFavorite = async (recipeId) => {
        if (!currentUser || !recipeId) throw new Error('Missing user or recipe ID');

        const recipeTitle = favorites.find(fav => String(fav.id) === String(recipeId))?.title || 'Recipe';

        try {
            // Optimistic update
            setFavorites(prev => prev.filter(fav => String(fav.id) !== String(recipeId)));
            setFavoriteIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(String(recipeId));
                return newSet;
            });

            // API call
            await favoritesService.removeFavorite(currentUser.uid, recipeId);

            return { success: true, message: `"${recipeTitle}" removed from favorites.` };
        } catch (error) {
            // Revert optimistic update on error (need to re-fetch to restore)
            await loadFavorites(true);

            console.error('Error removing favorite:', error);
            throw error;
        }
    };

    const isFavorited = (recipeId) => {
        return favoriteIds.has(String(recipeId));
    };

    const getFavoritesCount = () => {
        return favorites.length;
    };

    const getRecentFavorites = (limit = 3) => {
        return favorites
            .slice() // Create copy to avoid mutating original
            .sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0))
            .slice(0, limit);
    };

    const value = {
        favorites,
        loading,
        addFavorite,
        removeFavorite,
        isFavorited,
        getFavoritesCount,
        getRecentFavorites,
        refreshFavorites: () => loadFavorites(true)
    };

    return (
        <FavoritesContext.Provider value={value}>
            {children}
        </FavoritesContext.Provider>
    );
};