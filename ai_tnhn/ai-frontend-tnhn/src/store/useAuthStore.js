import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ==============================|| AUTH STORE ||============================== //

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      
      // Actions
      login: (userData, token, role) => {
        set({ user: userData, token, role });
      },
      logout: () => {
        set({ user: null, token: null, role: null });
        localStorage.removeItem('admin_token'); // Keep compatibility with existing code if needed
      },
      
      // Helper to check permission based on the "ticking" logic
      // This allows us to easily tick/untick roles for functions
      hasPermission: (allowedRoles) => {
        const currentRole = get().role;
        if (!currentRole) return false;
        if (currentRole === 'super_admin') return true; // Super admin has all permissions
        return allowedRoles.includes(currentRole);
      }
    }),
    {
      name: 'auth-storage'
    }
  )
);

export default useAuthStore;
