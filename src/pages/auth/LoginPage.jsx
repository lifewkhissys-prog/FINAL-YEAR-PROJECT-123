import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

import { login } from '../../api/auth.api';
import useAuthStore from '../../store/authStore';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Mocked login for now since backend might not be ready
      // const res = await login({ email, password });
      // setAuth(res.data.user, res.data.access_token);
      
      // MOCK DATA
        setTimeout(() => {
        const role = email.includes('lecturer') ? 'lecturer' : 'student';
        const mockUser = { id: 1, name: 'Student Demo', email, role };
        setAuth(mockUser, 'mock_token_12345');
        navigate(role === 'lecturer' ? '/lecturer/dashboard' : '/student/dashboard');
      }, 1000);

    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
      setLoading(false);
    }
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

        {error && <div className="mb-6"><Alert type="error" message={error} /></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="student@uni.edu"
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
      
      {/* Dev notes */}
      <div className="mt-8 text-xs text-[var(--text-muted)] bg-white/5 p-4 rounded-lg max-w-md border border-default">
        <p className="font-semibold mb-1">Developer Note (Mock Login):</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Type any email containing "lecturer" to login as Lecturer.</li>
          <li>Type anything else to login as Student.</li>
        </ul>
      </div>
    </motion.div>
  );
}

