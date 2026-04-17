import { create } from 'zustand';
import organizationApi from 'api/organization';
import { getDataArray, getTotalItems } from 'utils/apiHelper';

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
                organizations: getDataArray(res),
                totalItems: getTotalItems(res),
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
            // Đối với selectionList, res đã được bóc tách bởi interceptor 
            // và thường có cấu trúc { primary: [], shared: [] }
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
