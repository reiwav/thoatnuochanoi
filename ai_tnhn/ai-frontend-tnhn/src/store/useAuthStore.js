import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axiosClient from 'api/axiosClient';

// ==============================|| AUTH STORE ||============================== //

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      isEmployee: false,
      isCompany: false, // New state
      permissions: [],

      // Actions
      login: (userData, token, role, isEmployee = false, isCompany = false) => {
        set({
          user: userData,
          token,
          role: role,
          isEmployee: !!isEmployee,
          isCompany: !!isCompany
        });
        // Fetch permissions immediately after login if token exists
        get().fetchPermissions();
      },
      logout: () => {
        set({ user: null, token: null, role: null, isEmployee: false, isCompany: false, permissions: [] });
        localStorage.removeItem('admin_token');
      },
      fetchPermissions: async () => {
        const { token } = get();
        if (!token) return;
        try {
          // Dynamic permissions endpoint
          const response = await axiosClient.get('/admin/permissions/my');
          set({ permissions: response.data?.data || [] });
        } catch (error) {
          console.error('Failed to fetch permissions', error);
          if (error.response?.status === 401) {
            set({ permissions: [] });
          }
        }
      },

      hasPermission: (permissionId) => {
        const { role: currentRole, permissions, isCompany } = get();
        if (!currentRole) return false;
        if (isCompany) return true; // Company level has all permissions

        if (Array.isArray(permissionId)) {
          return permissionId.includes(currentRole);
        }

        return permissions.includes(permissionId);
      }
    }),
    {
      name: 'auth-storage'
    }
  )
);

export default useAuthStore;
