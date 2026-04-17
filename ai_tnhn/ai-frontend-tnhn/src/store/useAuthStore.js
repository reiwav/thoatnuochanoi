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
          const permissions = await axiosClient.get('/admin/permissions/my');
          // Since it's flattened by interceptor, permissions is already the payload
          set({ permissions: Array.isArray(permissions) ? permissions : [], permissionsLoaded: true });
        } catch (error) {
          console.error('Failed to fetch permissions', error);
          if (error.message?.includes('401')) {
            set({ permissions: [], permissionsLoaded: true });
          }
        }
      },

      hasPermission: (permissionId) => {
        const { role: currentRole, permissions } = get();
        if (!currentRole) return false;
        
        // Super Admin always has permission
        if (currentRole === 'super_admin') return true;

        // If permissionId is an array, check if user has ANY of the permissions 
        // OR if their role matches one of the values in the array (legacy support)
        if (Array.isArray(permissionId)) {
          return permissionId.some(p => permissions.includes(p) || p === currentRole);
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
