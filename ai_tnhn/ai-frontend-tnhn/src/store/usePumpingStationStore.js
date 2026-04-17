import { create } from 'zustand';
import pumpingStationApi from 'api/pumpingStation';
import { toast } from 'react-hot-toast';
import { getDataArray } from 'utils/apiHelper';

const usePumpingStationStore = create((set) => ({
    pumpingStations: [],
    loading: false,
    error: null,

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    fetchInitialData: async () => {
        set({ loading: true });
        try {
            const res = await pumpingStationApi.list();
            set({
                pumpingStations: getDataArray(res),
                loading: false
            });
        } catch (err) {
            set({ error: err.message, loading: false });
            toast.error('Lỗi khi tải danh sách trạm bơm');
        }
    },

    fetchPumpingStations: async () => {
        try {
            const res = await pumpingStationApi.list();
            set({ pumpingStations: getDataArray(res) });
        } catch (err) {
            console.error('Fetch pumping stations failed', err);
        }
    }
}));

export default usePumpingStationStore;
