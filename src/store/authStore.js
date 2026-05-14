import { create } from 'zustand';
import { getUserFromToken } from '../utils/auth';

const storedToken = localStorage.getItem('devlab_token');
const storedUser = getUserFromToken(storedToken) || (() => {
  try {
    return JSON.parse(localStorage.getItem('devlab_user') || 'null');
  } catch (error) {
    return null;
  }
})();

const useAuthStore = create((set) => ({
  user:            storedUser,
  token:           storedToken || null,
  isAuthenticated: !!storedUser,

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
