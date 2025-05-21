import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../styles/Auth.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, signInWithGoogle } = useAuth();

    // Handle email/password login
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            await login(email, password);
            navigate('/');
        } catch (error) {
            setError('Failed to log in: ' + error.message);
        }
        setLoading(false);
    };

    // Handle Google sign in
    const handleGoogleSignIn = async () => {
        try {
            setError('');
            setLoading(true);
            await signInWithGoogle();
            navigate('/');
        } catch (error) {
            setError('Failed to sign in with Google: ' + error.message);
        }
        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Welcome Back</h2>
                <p>Sign in to your Recipe Finder account</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" disabled={loading} className="auth-button">
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="divider">
                    <span>or</span>
                </div>

                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="google-button"
                >
                    <span className="google-icon">🔍</span>
                    Continue with Google
                </button>

                <div className="auth-links">
                    <p>
                        Don't have an account? <Link to="/register">Sign up here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;