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
      roleLevel: -1,
      isSuperAdmin: false,
      isEmployee: false,
      isCompany: false, // New state
      permissions: [],
      permissionsLoaded: false,
      permissionsLoading: false,

      // Actions
      login: (userData, token, role, isEmployee = false, isCompany = false, roleLevel = -1) => {
        const { token: currentToken, user: currentUser } = get();
        
        // Prevent redundant state reset if token and user ID are identical
        if (currentToken === token && currentUser?.id === userData?.id) {
          return;
        }

        // Robust normalization
        const level = parseInt(roleLevel !== undefined ? roleLevel : -1, 10);
        let normalizedRole = (role || '').toLowerCase().trim().replace(/\s+/g, '_');
        
        // Final normalization to 'super_admin' based on level or common string variants
        const isSuper = level === 0 || normalizedRole.includes('super_admin') || normalizedRole.includes('supper_admin');
        if (isSuper) {
          normalizedRole = 'super_admin';
        }

        set({
          user: userData,
          token,
          role: normalizedRole,
          roleLevel: level,
          isSuperAdmin: isSuper,
          isEmployee: !!isEmployee,
          isCompany: !!isCompany || isSuper, // Super Admin implicitly has company-level access
          permissionsLoaded: isSuper, // Super Admin skips permission fetch
          permissionsLoading: false
        });
        // Fetch permissions immediately after login if token exists
        if (!isSuper) {
          get().fetchPermissions();
        }
      },
      logout: () => {
        set({ user: null, token: null, role: null, roleLevel: -1, isSuperAdmin: false, isEmployee: false, isCompany: false, permissions: [], permissionsLoaded: false, permissionsLoading: false });
        localStorage.removeItem('admin_token');
      },
      fetchPermissions: async () => {
        const { token, permissionsLoading, permissionsLoaded, isSuperAdmin } = get();
        if (!token || permissionsLoading || permissionsLoaded) return;

        if (isSuperAdmin) {
          set({ permissionsLoaded: true });
          return;
        }

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
        const { role: currentRole, isSuperAdmin, permissions } = get();
        // Super Admin always has permission
        if (isSuperAdmin) return true;

        if (!currentRole) return false;

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
