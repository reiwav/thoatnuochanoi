import { create } from 'zustand';
import organizationApi from 'api/organization';

const useOrganizationStore = create((set, get) => ({
    // State
    organizations: [],
    selectionList: null, // Cache for dropdowns
    loading: false,
    totalItems: 0,
    filters: { name: '', code: '' },
    page: 0,
    rowsPerPage: 10,

    // Actions
    setFilters: (filters) => set({ filters, page: 0 }),
    setPage: (page) => set({ page }),
    setRowsPerPage: (rowsPerPage) => set({ rowsPerPage, page: 0 }),

    // Fetch paginated list for Admin UI
    fetchOrganizations: async () => {
        const { page, rowsPerPage, filters } = get();
        set({ loading: true });
        try {
            const res = await organizationApi.getAll({
                ...filters,
                page: page + 1,
                per_page: rowsPerPage
            });
            set({
                organizations: Array.isArray(res.data) ? res.data : [],
                totalItems: res.total || 0,
                loading: false
            });
        } catch (error) {
            console.error('Fetch organizations failed', error);
            set({ loading: false, organizations: [] });
        }
    },

    // Fetch short list for dropdowns (cached)
    fetchSelectionList: async (force = false) => {
        const { selectionList } = get();
        if (selectionList && !force) return selectionList;

        try {
            const res = await organizationApi.getSelectionList();
            set({ selectionList: res });
            return res;
        } catch (error) {
            console.error('Fetch selection list failed', error);
            return null;
        }
    },

    // CRUD wrappers that also sync state
    createOrganization: async (data) => {
        const res = await organizationApi.create(data);
        get().fetchOrganizations();
        get().fetchSelectionList(true); // Force refresh cache
        return res;
    },

    updateOrganization: async (id, data) => {
        const res = await organizationApi.update(id, data);
        get().fetchOrganizations();
        get().fetchSelectionList(true); // Force refresh cache
        return res;
    },

    deleteOrganization: async (id) => {
        const res = await organizationApi.delete(id);
        get().fetchOrganizations();
        get().fetchSelectionList(true); // Force refresh cache
        return res;
    }
}));

export default useOrganizationStore;
