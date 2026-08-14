import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { register } from '../../api/auth.api';

export function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'lecturer'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await register({ ...formData, role: 'lecturer' });
      navigate('/login', { state: { registered: true } });
    } catch (apiErr) {
      console.error("Registration failed:", apiErr);
      const detail = apiErr.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

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
          <h1 className="font-serif text-2xl font-bold text-primary mb-2">Create Supervisor Account</h1>
          <p className="text-sm text-on-surface-variant">Register as a lecturer to manage and evaluate student theses.</p>
        </div>

        {error && <div className="mb-6"><Alert type="error" message={error} /></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">Full Name</label>
            <input
              id="name"
              type="text"
              required
              placeholder="Dr. Kwame Mensah"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-container-high text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-primary bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">Email Address</label>
            <input
              id="email"
              type="email"
              required
              placeholder="lecturer@knust.edu.gh"
              value={formData.email}
              onChange={handleChange}
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
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-surface-container-high text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-primary bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">Account Type</label>
            <input
              type="text"
              disabled
              value="Academic Supervisor / Lecturer"
              className="w-full px-4 py-2.5 rounded-lg border border-surface-container-high text-sm text-on-surface-variant bg-surface-container-lowest font-medium cursor-not-allowed"
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
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Register Supervisor Account</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-surface-container-high text-center">
          <p className="text-xs text-on-surface-variant">
            Already have a supervisor account?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
