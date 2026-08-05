import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

import { login } from '../../api/auth.api';
import useAuthStore from '../../store/authStore';
import { getUserFromToken } from '../../utils/auth';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Code2 } from 'lucide-react';
import DevLabLogo from '../../components/ui/DevLabLogo';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.login);

  const performLogin = async (userEmail, userPassword) => {
    setLoading(true);
    setError('');
    
    try {
      try {
        const res = await login({ email: userEmail, password: userPassword });
        const token = res.data.access_token;
        const resolvedUser = getUserFromToken(token);
        if (resolvedUser) {
          setAuth(resolvedUser, token);
          navigate(resolvedUser.role === 'lecturer' ? '/lecturer/dashboard' : '/student/dashboard');
          return;
        }
      } catch (apiErr) {
        console.warn("Backend API login failed, attempting fallback.", apiErr);
        if (apiErr.response && (apiErr.response.status === 401 || apiErr.response.status === 400 || apiErr.response.status === 422)) {
          setError(apiErr.response.data?.detail || 'Invalid email or password');
          setLoading(false);
          return;
        }
      }

      // MOCK DATA Fallback
      setTimeout(() => {
        const role = userEmail.includes('lecturer') ? 'lecturer' : 'student';
        const name = role === 'lecturer' ? 'Dr. Kwame Mensah' : 'Ama Serwaa';
        const mockUser = { id: 1, name, email: userEmail, role };
        setAuth(mockUser, 'mock_token_12345');
        navigate(role === 'lecturer' ? '/lecturer/dashboard' : '/student/dashboard');
      }, 500);

    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    performLogin(email, password);
  };

  const handleQuickLogin = (demoRole) => {
    const demoEmail = demoRole === 'lecturer' ? 'lecturer@knust.edu.gh' : 'student@knust.edu.gh';
    const demoPass = 'password123';
    setEmail(demoEmail);
    setPassword(demoPass);
    performLogin(demoEmail, demoPass);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="min-h-screen flex flex-col items-center justify-center p-4"
    >

      <Link to="/" className="flex items-center gap-2 mb-8 group hover:opacity-80 transition-opacity">
        <DevLabLogo size="md" mono={false} />
      </Link>

      <div className="glass w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Welcome back</h1>
        <p className="text-[var(--text-secondary)] text-sm mb-6">Enter your details to sign in to your account</p>

        {/* Quick Demo Credentials Buttons */}
        <div className="mb-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs font-semibold text-brand-blue mb-2 flex items-center gap-1">
            ⚡ Quick Test / Demo Credentials:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('lecturer')}
              className="py-2 px-3 text-xs font-medium rounded-md bg-brand-purple/20 hover:bg-brand-purple/30 text-purple-300 border border-purple-500/30 transition-colors text-center"
            >
              Dr. Kwame (Lecturer)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('student')}
              className="py-2 px-3 text-xs font-medium rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors text-center"
            >
              Ama Serwaa (Student)
            </button>
          </div>
        </div>

        {error && <div className="mb-6"><Alert type="error" message={error} /></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="lecturer@knust.edu.gh"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <button 
            type="submit" 
            className="btn-primary w-full justify-center mt-6"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-blue hover:text-brand-purple transition-colors font-medium">
            Register here
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

