// src/pages/Favorites.jsx (Enhanced version)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useFavorites } from '../contexts/FavoritesContext.jsx';
import RecipeCard from '../components/RecipeCard.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import Notification from '../components/Notification.jsx';
import '../styles/Favorites.css';

const Favorites = () => {
    const { currentUser } = useAuth();
    const { favorites, loading, removeFavorite } = useFavorites();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [recipeToRemove, setRecipeToRemove] = useState(null);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [sortOption, setSortOption] = useState('newest');
    const [filterText, setFilterText] = useState('');
    const [visibleFavorites, setVisibleFavorites] = useState([]);
    const [isFiltering, setIsFiltering] = useState(false);

    // Sort and filter favorites whenever dependencies change
    useEffect(() => {
        if (!favorites || favorites.length === 0) {
            setVisibleFavorites([]);
            return;
        }

        // Copy and sort the favorites
        let sorted = [...favorites];

        // Apply sorting
        switch (sortOption) {
            case 'newest':
                sorted = sorted.sort((a, b) => {
                    if (a.dateAdded && b.dateAdded) {
                        return new Date(b.dateAdded) - new Date(a.dateAdded);
                    }
                    return 0;
                });
                break;
            case 'oldest':
                sorted = sorted.sort((a, b) => {
                    if (a.dateAdded && b.dateAdded) {
                        return new Date(a.dateAdded) - new Date(b.dateAdded);
                    }
                    return 0;
                });
                break;
            case 'alphabetical':
                sorted = sorted.sort((a, b) => {
                    const titleA = a.title || a.strMeal || '';
                    const titleB = b.title || b.strMeal || '';
                    return titleA.localeCompare(titleB);
                });
                break;
            default:
                break;
        }

        // Apply filtering
        if (filterText.trim()) {
            setIsFiltering(true);
            const filtered = sorted.filter(recipe => {
                const title = (recipe.title || recipe.strMeal || '').toLowerCase();
                const tags = (recipe.tags || recipe.strTags || '').toLowerCase();
                const ingredients = recipe.ingredients ? recipe.ingredients.join(' ').toLowerCase() : '';
                const filterLower = filterText.toLowerCase();

                return title.includes(filterLower) ||
                    tags.includes(filterLower) ||
                    ingredients.includes(filterLower);
            });

            setVisibleFavorites(filtered);
        } else {
            setIsFiltering(false);
            setVisibleFavorites(sorted);
        }
    }, [favorites, sortOption, filterText]);

    // Modal and Notification Logic
    const openRemoveConfirmationModal = (recipeId, recipeTitle) => {
        setRecipeToRemove({ id: recipeId, title: recipeTitle || "this recipe" });
        setIsModalOpen(true);
    };

    const closeRemoveConfirmationModal = () => {
        setIsModalOpen(false);
        setRecipeToRemove(null);
    };

    const handleConfirmRemoveFavorite = async () => {
        if (!recipeToRemove || !currentUser) return;

        try {
            const result = await removeFavorite(recipeToRemove.id);
            setNotification({ message: result.message, type: 'success' });
        } catch (err) {
            console.error('Error removing favorite:', err);
            setNotification({ message: 'Failed to remove favorite. Please try again.', type: 'error' });
        } finally {
            closeRemoveConfirmationModal();
        }
    };

    const handleCloseNotification = () => {
        setNotification({ message: '', type: '' });
    };

    const handleFavoriteChange = (status) => {
        if (status.success) {
            setNotification({ message: status.message, type: 'success' });
        } else {
            setNotification({ message: status.message || 'An error occurred.', type: 'error' });
        }
    };

    // Reset filters
    const handleResetFilters = () => {
        setFilterText('');
        setSortOption('newest');
    };

    // Not logged in state
    if (!currentUser && !loading) {
        return (
            <div className="favorites">
                <div className="favorites-header animated-gradient">
                    <div className="header-content">
                        <h1>My Favorite Recipes</h1>
                        <p>Your personalized collection of culinary treasures</p>
                    </div>
                    <div className="header-decorations">
                        <div className="deco-circle c1"></div>
                        <div className="deco-circle c2"></div>
                    </div>
                </div>

                <div className="empty-state glass-card" data-aos="fade-up">
                    <div className="empty-icon">💔</div>
                    <h2>Favorites Locked</h2>
                    <p>Please <Link to="/login" className="inline-link">log in</Link> to view and manage your favorite recipes.</p>
                    <div className="action-buttons">
                        <Link to="/login" className="btn btn-primary">
                            Log In
                        </Link>
                        <Link to="/search" className="btn btn-secondary">
                            Browse Recipes
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="favorites">
                <div className="favorites-header animated-gradient">
                    <div className="header-content">
                        <h1>My Favorite Recipes</h1>
                        <p>Your personalized collection of culinary treasures</p>
                    </div>
                </div>

                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Gathering your favorite recipes...</p>
                </div>

                <div className="favorites-skeleton">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton-image"></div>
                            <div className="skeleton-title"></div>
                            <div className="skeleton-text"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="favorites">
            {/* Enhanced header with animated gradient */}
            <div className="favorites-header animated-gradient">
                <div className="header-content">
                    <h1>My Favorite Recipes</h1>
                    <p>Your personalized collection of culinary treasures</p>

                    <div className="favorites-counter">
                        <span className="counter-number">{favorites.length}</span>
                        <span className="counter-text">Recipe{favorites.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div className="header-decorations">
                    <div className="deco-circle c1"></div>
                    <div className="deco-circle c2"></div>
                </div>
            </div>

            {favorites.length === 0 ? (
                <div className="empty-state glass-card" data-aos="fade-up">
                    <div className="empty-icon">❤️</div>
                    <h2>No Favorites Yet?</h2>
                    <p>Your recipe adventure awaits! Start exploring and save the dishes you love.</p>
                    <Link to="/search" className="btn btn-primary">
                        Find Recipes
                    </Link>
                </div>
            ) : (
                <div className="favorites-content">
                    {/* Toolbar with sorting and filtering options */}
                    <div className="favorites-toolbar glass-card">
                        <div className="search-filter">
                            <input
                                type="text"
                                placeholder="Filter by name, tags, or ingredients..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="filter-input"
                            />
                            {filterText && (
                                <button className="clear-filter" onClick={() => setFilterText('')}>
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className="sort-options">
                            <label>Sort by:</label>
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                className="sort-select"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="alphabetical">Alphabetical</option>
                            </select>
                        </div>
                    </div>

                    {/* Filter results info */}
                    {isFiltering && (
                        <div className="filter-results glass-card">
                            <p>
                                {visibleFavorites.length > 0
                                    ? `Found ${visibleFavorites.length} recipe${visibleFavorites.length !== 1 ? 's' : ''} matching "${filterText}"`
                                    : `No recipes found matching "${filterText}"`
                                }
                            </p>
                            <button className="reset-filters-btn" onClick={handleResetFilters}>
                                Reset Filters
                            </button>
                        </div>
                    )}

                    {/* Display recipes */}
                    {visibleFavorites.length > 0 ? (
                        <div className="recipes-grid">
                            {visibleFavorites.map((recipe, index) => (
                                <div
                                    key={recipe.id || recipe.idMeal || Math.random()}
                                    className="favorite-item glass-card"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <RecipeCard
                                        recipe={recipe}
                                        onFavoriteChange={handleFavoriteChange}
                                        hideFavoriteButton={true}
                                    />
                                    <button
                                        onClick={() => openRemoveConfirmationModal(recipe.id || recipe.idMeal, recipe.title || recipe.strMeal)}
                                        className="remove-favorite-btn"
                                        title="Remove from favorites"
                                        aria-label="Remove from favorites"
                                    >
                                        <span className="remove-icon">×</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : isFiltering ? (
                        <div className="empty-state glass-card">
                            <div className="empty-icon">🔎</div>
                            <h2>No Matching Recipes</h2>
                            <p>Try adjusting your filters to find what you're looking for.</p>
                            <button className="btn btn-primary" onClick={handleResetFilters}>
                                Clear Filters
                            </button>
                        </div>
                    ) : null}
                </div>
            )}

            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={closeRemoveConfirmationModal}
                onConfirm={handleConfirmRemoveFavorite}
                title="Confirm Removal"
                message={`Are you sure you want to remove "${recipeToRemove?.title || 'this recipe'}" from your favorites? This action cannot be undone.`}
                confirmText="Yes, Remove It"
                cancelText="Cancel"
            />

            <Notification
                message={notification.message}
                type={notification.type}
                duration={4000}
                onClose={handleCloseNotification}
            />
        </div>
    );
};

export default Favorites;