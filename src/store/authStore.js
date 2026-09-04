import { create } from 'zustand';
import { getUserFromToken } from '../utils/auth';

const getInitialAuth = () => {
  const token = localStorage.getItem('devlab_token');
  if (!token) return { user: null, token: null, isAuthenticated: false };

  const user = getUserFromToken(token);
  if (!user) {
    // Token is invalid or expired - purge immediately
    localStorage.removeItem('devlab_token');
    localStorage.removeItem('devlab_user');
    return { user: null, token: null, isAuthenticated: false };
  }

  return { user, token, isAuthenticated: true };
};

const initialAuth = getInitialAuth();

const useAuthStore = create((set) => ({
  user:            initialAuth.user,
  token:           initialAuth.token,
  isAuthenticated: initialAuth.isAuthenticated,

  login: (user, token) => {
    localStorage.setItem('devlab_token', token);
    if (user) localStorage.setItem('devlab_user', JSON.stringify(user));
    const resolvedUser = user || getUserFromToken(token);
    set({ user: resolvedUser, token, isAuthenticated: !!resolvedUser });
  },

  logout: () => {
    localStorage.removeItem('devlab_token');
    localStorage.removeItem('devlab_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;

