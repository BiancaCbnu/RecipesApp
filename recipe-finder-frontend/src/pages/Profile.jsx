import React, { useState } from 'react';
import { updateProfile, updatePassword } from 'firebase/auth';
import { auth } from '../firebase/firebase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../styles/Profile.css';

const Profile = () => {
    const { currentUser } = useAuth();
    const [formData, setFormData] = useState({
        displayName: currentUser?.displayName || '',
        email: currentUser?.email || ''
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            await updateProfile(auth.currentUser, {
                displayName: formData.displayName
            });
            setMessage('Profile updated successfully!');
        } catch (error) {
            setError('Failed to update profile: ' + error.message);
        }
        setLoading(false);
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return setError('New passwords do not match');
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            await updatePassword(auth.currentUser, passwordData.newPassword);
            setMessage('Password updated successfully!');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            setError('Failed to update password: ' + error.message);
        }
        setLoading(false);
    };

    const handleInputChange = (section, field, value) => {
        if (section === 'profile') {
            setFormData({ ...formData, [field]: value });
        } else if (section === 'password') {
            setPasswordData({ ...passwordData, [field]: value });
        }
    };

    return (
        <div className="profile">
            <div className="profile-header">
                <h1>Profile Settings</h1>
                <p>Manage your account information</p>
            </div>

            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}

            <div className="profile-content">
                <div className="profile-section">
                    <h2>Personal Information</h2>
                    <form onSubmit={handleProfileUpdate} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="displayName">Display Name</label>
                            <input
                                type="text"
                                id="displayName"
                                value={formData.displayName}
                                onChange={(e) => handleInputChange('profile', 'displayName', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={formData.email}
                                disabled
                                className="disabled-input"
                            />
                            <small>Email cannot be changed</small>
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Updating...' : 'Update Profile'}
                        </button>
                    </form>
                </div>

                <div className="profile-section">
                    <h2>Change Password</h2>
                    <form onSubmit={handlePasswordUpdate} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="newPassword">New Password</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={passwordData.newPassword}
                                onChange={(e) => handleInputChange('password', 'newPassword', e.target.value)}
                                required
                                minLength="6"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={(e) => handleInputChange('password', 'confirmPassword', e.target.value)}
                                required
                                minLength="6"
                            />
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>

                <div className="profile-section">
                    <h2>Account Statistics</h2>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-label">Account Created</span>
                            <span className="stat-value">
                                {currentUser?.metadata?.creationTime
                                    ? new Date(currentUser.metadata.creationTime).toLocaleDateString()
                                    : 'N/A'
                                }
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Last Sign In</span>
                            <span className="stat-value">
                                {currentUser?.metadata?.lastSignInTime
                                    ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString()
                                    : 'N/A'
                                }
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">User ID</span>
                            <span className="stat-value user-id">{currentUser?.uid}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;