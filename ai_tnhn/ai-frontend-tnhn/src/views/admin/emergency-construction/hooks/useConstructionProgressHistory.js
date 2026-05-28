import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import emergencyConstructionApi from 'api/emergencyConstruction';

const useConstructionProgressHistory = () => {
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState([]);
    const [constructions, setConstructions] = useState([]);
    const [totalReports, setTotalReports] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Filters
    const [dateFilter, setDateFilter] = useState(null);
    const [constructionFilter, setConstructionFilter] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Image viewer
    const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });

    const fetchConstructions = async () => {
        try {
            const res = await emergencyConstructionApi.getAll({ per_page: 1000 });
            if (res.data?.status === 'success') {
                setConstructions(res.data.data?.data || []);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách công trình:', err);
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const params = {
                page: page + 1,
                per_page: rowsPerPage,
                query: searchQuery
            };

            if (dateFilter) {
                params.date = dateFilter.format('YYYY-MM-DD');
            }

            if (constructionFilter.length > 0) {
                params.construction_ids = constructionFilter.join(',');
            }

            const res = await emergencyConstructionApi.getGlobalHistory(params);
            if (res.data?.status === 'success') {
                setReports(res.data.data?.data || []);
                setTotalReports(res.data.data?.total || 0);
            }
        } catch (err) {
            toast.error('Lỗi tải lịch sử báo cáo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConstructions();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [page, rowsPerPage, dateFilter, constructionFilter]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setPage(0);
            fetchReports();
        }
    };

    const handleOpenViewer = (images, index = 0) => {
        setViewer({ open: true, images, index });
    };

    const handleCloseViewer = () => {
        setViewer(v => ({ ...v, open: false }));
    };

    return {
        loading,
        reports,
        constructions,
        totalReports,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        dateFilter,
        setDateFilter,
        constructionFilter,
        setConstructionFilter,
        searchQuery,
        setSearchQuery,
        viewer,
        setViewer,
        handleSearch,
        handleOpenViewer,
        handleCloseViewer,
        fetchReports
    };
};

export default useConstructionProgressHistory;
