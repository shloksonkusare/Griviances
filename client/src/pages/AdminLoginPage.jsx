import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useToastStore } from '../store';
import { adminApi } from '../services/api';

export default function AdminLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { addToast } = useToastStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showInitForm, setShowInitForm] = useState(false);
  const [initName, setInitName] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      addToast('Please enter email and password', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const result = await adminApi.login(email, password);
      if (result.success) {
        login(result.data.admin, result.data.token);
        addToast('Login successful', 'success');
        navigate('/admin/dashboard');
      } else {
        addToast(result.message || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      addToast(message, 'error');
      
      // Check if this is a "no admin exists" error
      if (error.response?.status === 401 && message.includes('Invalid')) {
        // Could be first-time setup needed
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialize = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !initName) {
      addToast('Please fill all fields', 'error');
      return;
    }

    if (password.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }

    setIsInitializing(true);
    try {
      const result = await adminApi.initialize(email, password, initName);
      if (result.success) {
        login(result.data.admin, result.data.token);
        addToast('Super admin created successfully', 'success');
        navigate('/admin/dashboard');
      }
    } catch (error) {
      console.error('Init error:', error);
      const message = error.response?.data?.message || 'Initialization failed';
      addToast(message, 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🏛️</span>
            </div>
            <span className="text-xl font-bold text-gray-900">{t('app_name')}</span>
          </Link>
          <p className="mt-2 text-gray-600">Admin Dashboard</p>
        </div>

        {/* Login Card */}
        <div className="card">
          {!showInitForm ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-3"
                >
                  {isLoading ? (
                    <>
                      <div className="spinner w-5 h-5 mr-2" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  First time setup?{' '}
                  <button
                    onClick={() => setShowInitForm(true)}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Create Super Admin
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Super Admin</h2>
              <p className="text-sm text-gray-600 mb-4">
                This will create the first admin account for the system.
              </p>
              
              <form onSubmit={handleInitialize} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={initName}
                    onChange={(e) => setInitName(e.target.value)}
                    placeholder="Admin Name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password (min 8 characters)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isInitializing}
                  className="btn-primary w-full py-3"
                >
                  {isInitializing ? (
                    <>
                      <div className="spinner w-5 h-5 mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Super Admin'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowInitForm(false)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Back to login
                </button>
              </div>
            </>
          )}
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
