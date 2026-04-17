import { create } from 'zustand';
import axiosClient from 'api/axiosClient';

const useRoleStore = create((set, get) => ({
    // State
    roles: [],
    loading: false,

    // Actions
    fetchRoles: async () => {
        set({ loading: true });
        try {
            const res = await axiosClient.get('/admin/roles');
            set({
                roles: Array.isArray(res) ? res : [],
                loading: false
            });
        } catch (error) {
            console.error('Fetch roles failed', error);
            set({ loading: false, roles: [] });
        }
    },

    createRole: async (data) => {
        const res = await axiosClient.post('/admin/roles', data);
        get().fetchRoles();
        return res;
    },

    updateRole: async (id, data) => {
        const res = await axiosClient.put(`/admin/roles/${id}`, data);
        get().fetchRoles();
        return res;
    },

    deleteRole: async (id) => {
        const res = await axiosClient.delete(`/admin/roles/${id}`);
        get().fetchRoles();
        return res;
    }
}));

export default useRoleStore;
