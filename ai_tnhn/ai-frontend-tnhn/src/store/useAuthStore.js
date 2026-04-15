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
      permissionsLoaded: false,

      // Actions
      login: (userData, token, role, isEmployee = false, isCompany = false) => {
        set({
          user: userData,
          token,
          role: role,
          isEmployee: !!isEmployee,
          isCompany: !!isCompany,
          permissionsLoaded: false
        });
        // Fetch permissions immediately after login if token exists
        get().fetchPermissions();
      },
      logout: () => {
        set({ user: null, token: null, role: null, isEmployee: false, isCompany: false, permissions: [], permissionsLoaded: false });
        localStorage.removeItem('admin_token');
      },
      fetchPermissions: async () => {
        const { token } = get();
        if (!token) return;
        try {
          // Dynamic permissions endpoint
          const response = await axiosClient.get('/admin/permissions/my');
          set({ permissions: response.data?.data || [], permissionsLoaded: true });
        } catch (error) {
          console.error('Failed to fetch permissions', error);
          if (error.response?.status === 401) {
            set({ permissions: [], permissionsLoaded: true });
          }
        }
      },

      hasPermission: (permissionId) => {
        const { role: currentRole, permissions } = get();
        if (!currentRole) return false;
        
        // Only super_admin gets automatic all-access. 
        // Other isCompany users still follow the permission matrix.
        if (currentRole === 'super_admin') return true;

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
