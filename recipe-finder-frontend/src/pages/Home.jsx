// src/pages/Home.jsx (Enhanced version)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useFavorites } from '../contexts/FavoritesContext.jsx';
import { recipeService, mealPlanService } from '../services/api.js';
import RecipeCard from '../components/RecipeCard.jsx';
import Notification from '../components/Notification.jsx';
import '../styles/Home.css';

const Home = () => {
    const { currentUser } = useAuth();
    const { getFavoritesCount, getRecentFavorites } = useFavorites();
    const [featuredRecipes, setFeaturedRecipes] = useState([]);
    const [mealsPlannedCount, setMealsPlannedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [dataRefreshKey, setDataRefreshKey] = useState(0);
    const [greeting, setGreeting] = useState('');
    const [notification, setNotification] = useState({ message: '', type: '' });

    // Time-based greeting
    useEffect(() => {
        const hour = new Date().getHours();
        let timeGreeting = 'Welcome';

        if (hour >= 5 && hour < 12) {
            timeGreeting = 'Good morning';
        } else if (hour >= 12 && hour < 18) {
            timeGreeting = 'Good afternoon';
        } else {
            timeGreeting = 'Good evening';
        }

        setGreeting(timeGreeting);
    }, []);

    useEffect(() => {
        setLoading(true);
        const loadAllData = async () => {
            await loadFeaturedRecipes();
            if (currentUser) {
                await loadMealsPlannedCount();
            } else {
                setMealsPlannedCount(0);
            }
            setLoading(false);
        };
        loadAllData();
    }, [currentUser, dataRefreshKey]);

    const loadFeaturedRecipes = async () => {
        try {
            console.log('Loading featured recipes...');
            const data = await recipeService.complexSearch('popular', { number: 6 });

            // Check if we got results in the expected format
            if (data && Array.isArray(data.results)) {
                setFeaturedRecipes(data.results);
                console.log(`Loaded ${data.results.length} featured recipes`);
            } else {
                console.error('Unexpected format for featured recipes', data);
                setFeaturedRecipes([]);
            }
        } catch (error) {
            console.error('Error loading featured recipes:', error);
            setFeaturedRecipes([]);
        }
    };

    const loadMealsPlannedCount = async () => {
        if (!currentUser) { setMealsPlannedCount(0); return; }
        try {
            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            const mealPlan = await mealPlanService.getMealPlan(currentUser.uid, {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
            });
            setMealsPlannedCount(mealPlan.length);
        } catch (error) {
            console.error('Error loading meals planned count:', error);
            setMealsPlannedCount(0);
        }
    };

    const handleFavoriteChangeOnHome = (status) => {
        if (status.success) {
            setNotification({ message: status.message, type: 'success' });
        } else {
            setNotification({ message: status.message || 'An error occurred.', type: 'error' });
        }
    };

    const handleCloseNotification = () => {
        setNotification({ message: '', type: '' });
    };

    // Get data from context (no API calls needed)
    const totalFavoritesCount = getFavoritesCount();
    const recentFavorites = getRecentFavorites(3);

    // Render loading state for non-logged in users
    if (loading && !currentUser && dataRefreshKey === 0) {
        return (
            <div className="home">
                <section className="hero animated-gradient">
                    <div className="hero-content">
                        <div className="welcome-emoji">👨‍🍳</div>
                        <h1>Welcome, Chef!</h1>
                        <p>Discover amazing recipes and plan your meals. Please log in to see your dashboard.</p>
                        <div className="hero-actions">
                            <Link to="/login" className="cta-button primary">
                                Login
                            </Link>
                            <Link to="/search" className="cta-button secondary">
                                Search Recipes
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="featured-recipes">
                    <div className="section-header glass-card">
                        <h2>Featured Recipes</h2>
                        <Link to="/search" className="view-all-link">Explore More</Link>
                    </div>
                    {featuredRecipes.length === 0 && (
                        <div className="recipes-skeleton">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton-card">
                                    <div className="skeleton-image"></div>
                                    <div className="skeleton-title"></div>
                                    <div className="skeleton-text"></div>
                                </div>
                            ))}
                        </div>
                    )}
                    {featuredRecipes.length > 0 && (
                        <div className="recipes-grid">
                            {featuredRecipes.map(recipe => (
                                <RecipeCard
                                    key={recipe.idMeal || recipe.id}
                                    recipe={recipe}
                                    onFavoriteChange={handleFavoriteChangeOnHome}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        );
    }

    // Main loading state
    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading your culinary dashboard...</p>
            </div>
        );
    }

    return (
        <div className="home">
            {/* Hero Section with Dynamic Greeting */}
            <section className="hero animated-gradient">
                <div className="hero-content">
                    <div className="welcome-emoji">👨‍🍳</div>
                    <h1>{greeting}, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Chef'}!</h1>
                    <p>What delicious creations will you discover today?</p>
                    <div className="hero-actions">
                        <Link to="/search" className="cta-button primary">Search Recipes</Link>
                        <Link to="/meal-plan" className="cta-button secondary">View Meal Plan</Link>
                    </div>
                </div>
                <div className="hero-decorations">
                    <div className="deco-circle c1"></div>
                    <div className="deco-circle c2"></div>
                    <div className="deco-circle c3"></div>
                </div>
            </section>

            {/* Dashboard Stats */}
            <section className="dashboard-stats">
                <div className="stats-grid">
                    <div className="stat-card glass-card">
                        <div className="stat-icon">❤️</div>
                        <div className="stat-content">
                            <h3 className="counter">{totalFavoritesCount}</h3>
                            <p>Favorite Recipes</p>
                            <Link to="/favorites" className="stat-link">View All</Link>
                        </div>
                    </div>
                    <div className="stat-card glass-card">
                        <div className="stat-icon">🍽️</div>
                        <div className="stat-content">
                            <h3 className="counter">{mealsPlannedCount}</h3>
                            <p>Meals This Week</p>
                            <Link to="/meal-plan" className="stat-link">Plan More</Link>
                        </div>
                    </div>
                    <div className="stat-card glass-card">
                        <div className="stat-icon">🔍</div>
                        <div className="stat-content">
                            <h3 className="counter">304</h3>
                            <p>Recipes Available</p>
                            <Link to="/search" className="stat-link">Browse All</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Recent Favorites with improved empty state */}
            {currentUser && (
                <section className="recent-favorites">
                    <div className="section-header glass-card">
                        <h2>Your Recent Favorites</h2>
                        {recentFavorites.length > 0 && (
                            <Link to="/favorites" className="view-all-link">View All</Link>
                        )}
                    </div>

                    {recentFavorites.length > 0 ? (
                        <div className="recipes-grid">
                            {recentFavorites.map(recipe => (
                                <RecipeCard
                                    key={recipe.idMeal || recipe.id}
                                    recipe={recipe}
                                    onFavoriteChange={handleFavoriteChangeOnHome}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state glass-card">
                            <div className="empty-icon">❤️</div>
                            <h2>No favorites yet</h2>
                            <p>Discover and save your favorite recipes to access them quickly.</p>
                            <Link to="/search" className="cta-button primary">Discover Recipes</Link>
                        </div>
                    )}
                </section>
            )}

            {/* Featured Recipes with improved layout */}
            <section className="featured-recipes">
                <div className="section-header glass-card">
                    <h2>Featured Recipes</h2>
                    <Link to="/search" className="view-all-link">Explore More</Link>
                </div>

                {featuredRecipes.length > 0 ? (
                    <div className="recipes-grid">
                        {featuredRecipes.map(recipe => (
                            <RecipeCard
                                key={recipe.idMeal || recipe.id}
                                recipe={recipe}
                                onFavoriteChange={handleFavoriteChangeOnHome}
                            />
                        ))}
                    </div>
                ) : (
                    !loading && (
                        <div className="empty-state glass-card">
                            <div className="empty-icon">🍳</div>
                            <p>No featured recipes available at the moment.</p>
                            <Link to="/search" className="cta-button primary">Browse All Recipes</Link>
                        </div>
                    )
                )}
            </section>

            {/* Quick Actions with hover animations */}
            <section className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <Link to="/search" className="action-card glass-card">
                        <div className="action-icon">🔍</div>
                        <h3>Search Recipes</h3>
                        <p>Find recipes by name, ingredients, or cuisine</p>
                        <div className="action-arrow">→</div>
                    </Link>
                    <Link to="/meal-plan" className="action-card glass-card">
                        <div className="action-icon">📅</div>
                        <h3>Plan Your Week</h3>
                        <p>Organize your meals for the week ahead</p>
                        <div className="action-arrow">→</div>
                    </Link>
                    <Link to="/favorites" className="action-card glass-card">
                        <div className="action-icon">❤️</div>
                        <h3>Your Favorites</h3>
                        <p>Revisit your saved recipes</p>
                        <div className="action-arrow">→</div>
                    </Link>
                </div>
            </section>

            {/* Seasonal Recommendations - New Section */}
            <section className="seasonal-section">
                <div className="section-header glass-card">
                    <h2>Seasonal Inspiration</h2>
                    <Link to="/search?season=current" className="view-all-link">See More</Link>
                </div>
                <div className="season-banner glass-card">
                    <div className="season-content">
                        <div className="season-icon">🌱</div>
                        <div className="season-text">
                            <h3>Spring Delights</h3>
                            <p>Discover fresh recipes featuring seasonal spring ingredients.</p>
                            <Link to="/search?season=spring" className="cta-button secondary">Explore Spring Recipes</Link>
                        </div>
                    </div>
                </div>
            </section>

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

export default Home;