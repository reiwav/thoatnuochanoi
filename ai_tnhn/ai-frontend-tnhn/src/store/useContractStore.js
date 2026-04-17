import { create } from 'zustand';
import contractApi from 'api/contract';

const useContractStore = create((set, get) => ({
    // State
    contracts: [],
    loading: false,
    filters: { name: '' },

    // Actions
    setFilters: (filters) => set({ filters }),
    
    fetchContracts: async () => {
        const { filters } = get();
        set({ loading: true });
        try {
            const res = await contractApi.getAll(filters);
            // Handling both {data: []} and [] response formats
            const dataArray = res.data || res;
            set({
                contracts: Array.isArray(dataArray) ? dataArray : [],
                loading: false
            });
        } catch (error) {
            console.error('Fetch contracts failed', error);
            set({ loading: false, contracts: [] });
        }
    },

    createContract: async (data) => {
        const res = await contractApi.create(data);
        get().fetchContracts();
        return res;
    },

    updateContract: async (id, data) => {
        const res = await contractApi.update(id, data);
        get().fetchContracts();
        return res;
    },

    deleteContract: async (id) => {
        const res = await contractApi.delete(id);
        get().fetchContracts();
        return res;
    }
}));

export default useContractStore;
