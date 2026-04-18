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
      permissionsLoading: false,

      // Actions
      login: (userData, token, role, isEmployee = false, isCompany = false) => {
        const { token: currentToken, user: currentUser } = get();
        
        // Prevent redundant state reset if token and user ID are identical
        if (currentToken === token && currentUser?.id === userData?.id) {
          return;
        }

        set({
          user: userData,
          token,
          role: role,
          isEmployee: !!isEmployee,
          isCompany: !!isCompany,
          permissionsLoaded: false,
          permissionsLoading: false
        });
        // Fetch permissions immediately after login if token exists
        get().fetchPermissions();
      },
      logout: () => {
        set({ user: null, token: null, role: null, isEmployee: false, isCompany: false, permissions: [], permissionsLoaded: false, permissionsLoading: false });
        localStorage.removeItem('admin_token');
      },
      fetchPermissions: async () => {
        const { token, permissionsLoading, permissionsLoaded } = get();
        if (!token || permissionsLoading || permissionsLoaded) return;

        set({ permissionsLoading: true });
        try {
          // Dynamic permissions endpoint
          const permissions = await axiosClient.get('/admin/permissions/my');
          set({ 
            permissions: Array.isArray(permissions) ? permissions : [], 
            permissionsLoaded: true,
            permissionsLoading: false 
          });
        } catch (error) {
          console.error('Failed to fetch permissions', error);
          if (error.message?.includes('401')) {
            set({ permissions: [], permissionsLoaded: true, permissionsLoading: false });
          } else {
            set({ permissionsLoading: false });
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
