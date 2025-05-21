import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/firebase.js';
import '../styles/Navbar.css'; // Fixed: should be ../styles/ not ./

const Navbar = ({ user }) => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand">
                    🍳 Recipe Finder
                </Link>

                {user && (
                    <div className="navbar-menu">
                        <Link to="/" className="navbar-link">Home</Link>
                        <Link to="/search" className="navbar-link">Search</Link>
                        <Link to="/favorites" className="navbar-link">Favorites</Link>
                        <Link to="/meal-plan" className="navbar-link">Meal Plan</Link>
                        <div className="navbar-user">
                            <span>Hello, {user.displayName || user.email}</span>
                            <button onClick={handleLogout} className="logout-btn">
                                Logout
                            </button>
                        </div>
                    </div>
                )}

                {!user && (
                    <div className="navbar-menu">
                        <Link to="/login" className="navbar-link">Login</Link>
                        <Link to="/register" className="navbar-link">Register</Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;