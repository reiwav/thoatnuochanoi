import { create } from 'zustand';
import emergencyConstructionApi from 'api/emergencyConstruction';
import { getDataArray, getTotalItems } from 'utils/apiHelper';

const useEmergencyStore = create((set, get) => ({
    // State
    items: [],
    loading: false,
    totalItems: 0,
    page: 0,
    rowsPerPage: 10,
    filters: { name: '', status: '', org_id: '' },

    // Actions
    setFilters: (filters) => set({ filters, page: 0 }),
    setPage: (page) => set({ page }),
    setRowsPerPage: (rowsPerPage) => set({ rowsPerPage, page: 0 }),

    fetchItems: async () => {
        const { page, rowsPerPage, filters } = get();
        set({ loading: true });
        try {
            const res = await emergencyConstructionApi.getAll({
                ...filters,
                page: page + 1,
                per_page: rowsPerPage
            });
            set({
                items: getDataArray(res),
                totalItems: getTotalItems(res),
                loading: false
            });
        } catch (error) {
            console.error('Fetch emergency constructions failed', error);
            set({ loading: false, items: [] });
        }
    },

    createItem: async (data) => {
        const res = await emergencyConstructionApi.create(data);
        get().fetchItems();
        return res;
    },

    updateItem: async (id, data) => {
        const res = await emergencyConstructionApi.update(id, data);
        get().fetchItems();
        return res;
    },

    deleteItem: async (id) => {
        const res = await emergencyConstructionApi.delete(id);
        get().fetchItems();
        return res;
    }
}));

export default useEmergencyStore;
