import { create } from 'zustand';

export const useProblemStore = create((set, get) => ({
  problems: [],
  currentProblem: null,
  loading: false,
  error: null,

  // Fetch all problems for the lecturer
  fetchProblems: async () => {
    set({ loading: true });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In a real app, this would be: const response = await api.get('/problems');
      set({ loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Save or Update a problem
  saveProblem: async (problemData) => {
    set({ loading: true });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newProblem = {
        ...problemData,
        id: problemData.id || Math.random().toString(36).substr(2, 9),
        updatedAt: new Date().toISOString()
      };

      set(state => ({
        problems: problemData.id 
          ? state.problems.map(p => p.id === problemData.id ? newProblem : p)
          : [...state.problems, newProblem],
        loading: false
      }));

      return newProblem;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Delete a problem
  deleteProblem: async (id) => {
    set({ loading: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      set(state => ({
        problems: state.problems.filter(p => p.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  }
}));
