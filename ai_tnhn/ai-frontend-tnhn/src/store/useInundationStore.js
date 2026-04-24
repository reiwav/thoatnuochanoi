import { create } from 'zustand';
import inundationApi from 'api/inundation';
import organizationApi from 'api/organization';
import { toast } from 'react-hot-toast';
import { getDataArray } from 'utils/apiHelper';

const useInundationStore = create((set, get) => ({
    points: [],
    organizations: [],
    historyReports: [],
    totalHistory: 0,
    
    loading: false,
    loadingHistory: false,
    error: null,

    // Filters & Pagination state
    filters: {
        activeTab: 0,
        searchQuery: '',
        orgFilter: 'all',
        statusFilter: 'all',
        fromTime: null,
        toTime: null,
        isFlooding: ''
    },

    setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
    })),

    // Actions
    fetchInitialData: async () => {
        set({ loading: true });
        try {
            const [pointsRes, orgsRes] = await Promise.all([
                inundationApi.getPointsStatus(),
                organizationApi.getAll()
            ]);
            
            set({
                points: getDataArray(pointsRes),
                organizations: getDataArray(orgsRes),
                loading: false
            });
        } catch (err) {
            set({ error: err.message, loading: false });
            toast.error('Lỗi khi tải dữ liệu ban đầu');
        }
    },

    fetchPoints: async () => {
        try {
            const res = await inundationApi.getPointsStatus();
            set({ points: getDataArray(res) });
        } catch (err) {
            console.error('Fetch points failed', err);
        }
    },

    fetchHistory: async (page = 0, limit = 10) => {
        set({ loadingHistory: true });
        const { filters } = get();
        try {
            const apiFilters = {
                org_id: filters.orgFilter === 'all' ? '' : filters.orgFilter,
                status: filters.statusFilter === 'all' ? '' : filters.statusFilter,
                from_time: filters.fromTime,
                to_time: filters.toTime,
                is_flooding: filters.isFlooding
            };
            const res = await inundationApi.listReports(page, limit, apiFilters);
            set({
                historyReports: getDataArray(res),
                totalHistory: res?.total || 0,
                loadingHistory: false
            });
            return res; // Trả về để lấy tổng số trang ở UI
        } catch (err) {
            set({ loadingHistory: false });
            toast.error('Lỗi khi tải lịch sử');
        }
    },

    // Technical Actions
    updateSurvey: async (reportId, formData) => {
        try {
            await inundationApi.updateSurvey(reportId, formData);
            toast.success('Cập nhật XNTK thành công');
            get().fetchPoints();
            return true;
        } catch (err) {
            toast.error('Lỗi khi cập nhật khảo sát');
            return false;
        }
    },

    updateMech: async (reportId, formData) => {
        try {
            await inundationApi.updateMech(reportId, formData);
            toast.success('Cập nhật cơ giới thành công');
            get().fetchPoints();
            return true;
        } catch (err) {
            toast.error('Lỗi khi cập nhật cơ giới');
            return false;
        }
    },

    reviewReport: async (reportId, comment, isUpdate = false) => {
        try {
            if (isUpdate) {
                await inundationApi.reviewUpdate(reportId, comment);
            } else {
                await inundationApi.reviewReport(reportId, comment);
            }
            toast.success('Đã gửi nhận xét rà soát');
            get().fetchPoints();
            return true;
        } catch (err) {
            toast.error('Lỗi khi gửi nhận xét');
            return false;
        }
    },

    resolveReport: async (reportId) => {
        try {
            await inundationApi.resolveReport(reportId);
            toast.success('Đã kết thúc ngập');
            get().fetchPoints();
            return true;
        } catch (err) {
            toast.error('Lỗi khi kết thúc ngập');
            return false;
        }
    },
    
    quickFinishPoint: async (pointId) => {
        try {
            await inundationApi.quickFinish(pointId);
            toast.success('Đã kết thúc nhanh đợt ngập');
            get().fetchPoints();
            return true;
        } catch (err) {
            toast.error('Lỗi khi kết thúc nhanh');
            return false;
        }
    }
}));

export default useInundationStore;
