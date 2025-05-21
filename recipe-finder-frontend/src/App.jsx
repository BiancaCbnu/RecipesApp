// src/App.jsx (Updated with FavoritesProvider)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { FavoritesProvider } from './contexts/FavoritesContext.jsx'; // NEW
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import RecipeSearch from './pages/RecipeSearch.jsx';
import RecipeDetail from './pages/RecipeDetail.jsx';
import Favorites from './pages/Favorites.jsx';
import MealPlan from './pages/MealPlan.jsx';
import Profile from './pages/Profile.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import './styles/App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading...</p>
    </div>;
  }

  return currentUser ? children : <Navigate to="/login" />;
};

// App Content Component (needs to be inside AuthProvider to use useAuth)
const AppContent = () => {
  const { currentUser } = useAuth();

  return (
    <>
      <Navbar user={currentUser} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<RecipeSearch />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/favorites" element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          } />
          <Route path="/meal-plan" element={
            <ProtectedRoute>
              <MealPlan />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </>
  );
};

// Main App Component
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <FavoritesProvider> {/* NEW: Wrap with FavoritesProvider */}
          <div className="App">
            <AppContent />
          </div>
        </FavoritesProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;