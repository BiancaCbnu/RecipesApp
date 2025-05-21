import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPopup,
    GoogleAuthProvider,
    updateProfile,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase/firebase.js';

// Create the AuthContext
const AuthContext = createContext();

// Custom hook to use the AuthContext
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initialize Google Auth Provider
    const googleProvider = new GoogleAuthProvider();

    useEffect(() => {
        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return unsubscribe;
    }, []);

    // Sign up with email and password
    const signup = async (email, password, firstName, lastName) => {
        try {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);

            // Update user profile with display name
            await updateProfile(user, {
                displayName: `${firstName} ${lastName}`
            });

            return user;
        } catch (error) {
            throw error;
        }
    };

    // Sign in with email and password
    const login = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (error) {
            throw error;
        }
    };

    // Sign in with Google
    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            throw error;
        }
    };

    // Sign out
    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            throw error;
        }
    };

    // Reset password
    const resetPassword = async (email) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            throw error;
        }
    };

    // Update user profile
    const updateUserProfile = async (updates) => {
        try {
            await updateProfile(auth.currentUser, updates);
        } catch (error) {
            throw error;
        }
    };

    // The value object that will be provided to all children
    const value = {
        currentUser,
        loading,
        signup,
        login,
        signInWithGoogle,
        logout,
        resetPassword,
        updateUserProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};