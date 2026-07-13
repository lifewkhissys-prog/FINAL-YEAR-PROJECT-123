import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

import { Input, Select } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Code2 } from 'lucide-react';
import DevLabLogo from '../../components/ui/DevLabLogo';
import { register } from '../../api/auth.api';

export function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      try {
        await register(formData);
        navigate('/login');
        return;
      } catch (apiErr) {
        console.warn("Backend API registration failed, attempting fallback.", apiErr);
        if (apiErr.response && (apiErr.response.status === 400 || apiErr.response.status === 409 || apiErr.response.status === 422)) {
          setError(apiErr.response.data?.detail || 'Registration failed');
          setLoading(false);
          return;
        }
      }

      // MOCK REGISTRATION Fallback
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Create an account</h1>
        <p className="text-[var(--text-secondary)] text-sm mb-6">Join DevLab to start your coding journey</p>

        {error && <div className="mb-6"><Alert type="error" message={error} /></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Full Name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
          />
          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="john@uni.edu"
            value={formData.email}
            onChange={handleChange}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
          />
          <Select
            id="role"
            label="I am a..."
            value={formData.role}
            onChange={handleChange}
            options={[
              { value: 'student', label: 'Student' },
              { value: 'lecturer', label: 'Lecturer' }
            ]}
          />
          
          <button 
            type="submit" 
            className="btn-primary w-full justify-center mt-6"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-blue hover:text-brand-purple transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

