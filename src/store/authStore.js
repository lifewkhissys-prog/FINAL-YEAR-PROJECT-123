import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user:            null,
  token:           localStorage.getItem('devlab_token') || null,
  isAuthenticated: !!localStorage.getItem('devlab_token'),

  login: (user, token) => {
    localStorage.setItem('devlab_token', token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('devlab_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;
