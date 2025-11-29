// ============================================================================
// E&T MANAGER - CHANGE PASSWORD PAGE
// Shown on first login when must_change_password is true
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Key, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, mustChangePassword, changePassword, signOut } = useAuth();
  const navigate = useNavigate();

  // Password requirements
  const requirements = [
    { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { id: 'uppercase', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { id: 'lowercase', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { id: 'number', label: 'One number', test: (p) => /\d/.test(p) },
    { id: 'special', label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  const passwordValid = requirements.every((req) => req.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!passwordValid) {
      setError('Password does not meet all requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await changePassword(newPassword);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Failed to change password');
    }
    
    setLoading(false);
  }

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  // If not logged in or doesn't need to change password, redirect
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Change Your Password</h1>
          <p className="text-gray-600 mt-1">
            {mustChangePassword 
              ? 'Please set a new password to continue'
              : 'Update your password'
            }
          </p>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Info Alert for first-time */}
          {mustChangePassword && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Welcome!</strong> For security, please create a new password. 
                Your temporary password will no longer work after this.
              </p>
            </div>
          )}
          
          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {/* Password Requirements */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Password requirements:</p>
              <ul className="space-y-1">
                {requirements.map((req) => (
                  <li key={req.id} className="flex items-center gap-2 text-sm">
                    {req.test(newPassword) ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className={req.test(newPassword) ? 'text-green-700' : 'text-gray-600'}>
                      {req.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  confirmPassword && !passwordsMatch 
                    ? 'border-red-300 bg-red-50' 
                    : confirmPassword && passwordsMatch 
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300'
                }`}
                placeholder="Confirm new password"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Passwords match
                </p>
              )}
            </div>
            
            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !passwordValid || !passwordsMatch}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Updating password...
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Set New Password
                </>
              )}
            </button>
          </form>
          
          {/* Logout option */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign out and return to login
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          E&T Manager by Foodek Consulting
        </p>
      </div>
    </div>
  );
}

export default ChangePasswordPage;
