import { create } from 'zustand';
import employeeApi from 'api/employee';

const useEmployeeStore = create((set, get) => ({
    // State
    employees: [],
    loading: false,
    totalItems: 0,
    filters: { name: '', email: '', org_id: '' },
    page: 0,
    rowsPerPage: 10,

    // Actions
    setFilters: (filters) => set({ filters, page: 0 }),
    setPage: (page) => set({ page }),
    setRowsPerPage: (rowsPerPage) => set({ rowsPerPage, page: 0 }),

    fetchEmployees: async () => {
        const { page, rowsPerPage, filters } = get();
        set({ loading: true });
        try {
            const res = await employeeApi.getAll({
                ...filters,
                page: page + 1,
                per_page: rowsPerPage,
                order_by: '-created_at'
            });
            set({
                employees: Array.isArray(res.data) ? res.data : [],
                totalItems: res.total || 0,
                loading: false
            });
        } catch (error) {
            console.error('Fetch employees failed', error);
            set({ loading: false, employees: [] });
        }
    },

    createEmployee: async (data) => {
        const res = await employeeApi.create(data);
        get().fetchEmployees();
        return res;
    },

    updateEmployee: async (id, data) => {
        const res = await employeeApi.update(id, data);
        get().fetchEmployees();
        return res;
    },

    deleteEmployee: async (id) => {
        const res = await employeeApi.delete(id);
        get().fetchEmployees();
        return res;
    }
}));

export default useEmployeeStore;
