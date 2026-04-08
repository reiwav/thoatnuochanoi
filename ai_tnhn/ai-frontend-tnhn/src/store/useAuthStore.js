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
      permissions: [], // New state for dynamic permissions
      
      // Actions
      login: (userData, token, role, isEmployee = false) => {
        let normalizedRole = role;
        if (role === 'giam_doc_xi_nghiep') normalizedRole = 'giam_doc_xn';
        if (['supper_admin', 'supper_admib', 'super_admin '].includes(role)) normalizedRole = 'super_admin';
        set({ user: userData, token, role: normalizedRole, isEmployee: !!isEmployee });
        // Fetch permissions immediately after login if token exists
        get().fetchPermissions();
      },
      logout: () => {
        set({ user: null, token: null, role: null, permissions: [] });
        localStorage.removeItem('admin_token'); // Maintain compatibility with legacy code
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
          // Don't clear if it's just a network error, but maybe clear on 401
          if (error.response?.status === 401) {
            set({ permissions: [] });
          }
        }
      },
      
      // Helper to check permission based on the "ticking" logic
      // This allows us to easily tick/untick roles for functions
      hasPermission: (permissionId) => {
        const { role: currentRole, permissions } = get();
        if (!currentRole) return false;
        if (currentRole === 'super_admin') return true; // Super admin has all permissions
        
        // If it's a legacy check passing an array of roles, we can still support it, 
        // but the new way is to pass the permissionId (string) e.g. "ai-support"
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
