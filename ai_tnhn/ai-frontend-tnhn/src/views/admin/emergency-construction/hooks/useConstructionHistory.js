import { useState, useEffect } from 'react';
import emergencyConstructionApi from 'api/emergencyConstruction';

const useConstructionHistory = () => {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const loadHistory = async () => {
        setLoading(true);
        try {
            const res = await emergencyConstructionApi.getGlobalHistory({ 
                page: page + 1, 
                per_page: rowsPerPage,
                query: debouncedSearch 
            });
            if (res.data?.status === 'success') {
                setItems(res.data.data?.data || []);
                setTotalItems(res.data.data?.total || 0);
            }
        } catch (err) {
            console.error('Lỗi tải lịch sử:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        loadHistory();
    }, [page, rowsPerPage, debouncedSearch]);

    return {
        loading,
        items,
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        totalItems,
        searchQuery,
        setSearchQuery
    };
};

export default useConstructionHistory;
