import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../../api/auth.api';
import useAuthStore from '../../store/authStore';
import { getUserFromToken } from '../../utils/auth';
import { Alert } from '../../components/ui/Alert';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.login);

  const queryParams = new URLSearchParams(location.search);
  const isExpired = queryParams.get('expired') === 'true';
  const initialError = location.state?.error || (isExpired ? 'Your session has expired. Please sign in again.' : '');


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await login({ email, password });
      const token = res.data?.access_token;
      const resolvedUser = getUserFromToken(token);
      
      if (!resolvedUser) {
        setError('Invalid authentication token received from server.');
        setLoading(false);
        return;
      }

      if (resolvedUser.role !== 'lecturer') {
        setError('Access Denied: The Thesis Assessor platform is strictly reserved for academic supervisors and lecturers.');
        setLoading(false);
        return;
      }

      setAuth(resolvedUser, token);
      const from = location.state?.from?.pathname || '/thesis/dashboard';
      navigate(from, { replace: true });
    } catch (apiErr) {
      console.error("Login attempt failed:", apiErr);
      const detail = apiErr.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Invalid email address or password.');
      setLoading(false);
    }
  };

  const activeError = error || initialError;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-4"
    >
      <Link to="/" className="flex items-center gap-2 mb-8 group hover:opacity-80 transition-opacity">
        <span className="material-symbols-outlined text-primary text-32" style={{ fontVariationSettings: "'FILL' 1" }}>
          verified_user
        </span>
        <span className="font-serif text-2xl font-bold text-primary">Thesis Assessor</span>
      </Link>

      <div className="bg-white border border-surface-container-high rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-bold text-primary mb-2">Supervisor Sign In</h1>
          <p className="text-sm text-on-surface-variant">Enter your lecturer credentials to access your assessment workspace.</p>
        </div>

        {location.state?.registered && (
          <div className="mb-6">
            <Alert type="success" message="Registration successful! Please sign in with your credentials." />
          </div>
        )}

        {activeError && <div className="mb-6"><Alert type="error" message={activeError} /></div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">Email Address</label>
            <input
              id="email"
              type="email"
              required
              placeholder="lecturer@knust.edu.gh"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-container-high text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-primary bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">Password</label>
            <input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-container-high text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-primary bg-white"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-6"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-surface-container-high text-center">
          <p className="text-xs text-on-surface-variant">
            Need a supervisor account?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}


