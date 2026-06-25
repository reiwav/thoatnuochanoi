import { useState, useEffect, useMemo } from 'react';
import sluiceGateApi from 'api/sluiceGate';
import organizationApi from 'api/organization';
import useAuthStore from 'store/useAuthStore';

const useStationSluiceGateSummary = () => {
    const { user, isCompany, hasPermission } = useAuthStore();
    const [gates, setGates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [orgs, setOrgs] = useState({ primary: [], shared: [] });

    // Filters
    const [selectedOrg, setSelectedOrg] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all'); // all, open, closed

    // Dialog states
    const [selectedGate, setSelectedGate] = useState(null);
    const [openReport, setOpenReport] = useState(false);
    const [openHistory, setOpenHistory] = useState(false);

    const fetchGates = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await sluiceGateApi.list({ per_page: 1000 });
            setGates(res?.data || (Array.isArray(res) ? res : []));
        } catch (error) {
            console.error('Failed to fetch sluice gates', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchOrgs = async () => {
        try {
            const res = await organizationApi.getSelectionList();
            setOrgs(res || { primary: [], shared: [] });
        } catch (error) {
            console.error('Failed to fetch orgs', error);
        }
    };

    const loadData = async () => {
        await Promise.all([fetchGates(false), fetchOrgs()]);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Polling every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchGates(true);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredGates = useMemo(() => {
        let result = gates;

        // Filter by organization
        if (selectedOrg !== 'all' && selectedOrg) {
            result = result.filter(g => g.org_id === selectedOrg);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(g =>
                g.name?.toLowerCase().includes(q) ||
                g.address?.toLowerCase().includes(q)
            );
        }

        // Filter by status
        if (selectedStatus === 'open') {
            result = result.filter(g => g.doors?.some(d => d === true));
        } else if (selectedStatus === 'closed') {
            result = result.filter(g => !g.doors?.some(d => d === true));
        }

        return result;
    }, [gates, selectedOrg, searchQuery, selectedStatus]);

    // Status counts
    const statusCounts = useMemo(() => {
        const counts = { all: filteredGates.length, open: 0, closed: 0 };
        filteredGates.forEach(g => {
            const hasOpen = g.doors?.some(d => d === true);
            if (hasOpen) {
                counts.open++;
            } else {
                counts.closed++;
            }
        });
        return counts;
    }, [filteredGates]);

    const handleReportClick = (gate) => {
        setSelectedGate(gate);
        setOpenReport(true);
    };

    const handleHistoryClick = (gate) => {
        setSelectedGate(gate);
        setOpenHistory(true);
    };

    const handleReportSuccess = () => {
        setOpenReport(false);
        fetchGates(true);
    };

    const getOrgNames = (orgId) => {
        const allOrgs = [...(orgs.primary || []), ...(orgs.shared || [])];
        const match = allOrgs.find(o => o.id === orgId);
        return match ? match.name : orgId;
    };

    return {
        user,
        isCompany,
        hasPermission,
        gates: filteredGates,
        isLoading: loading,
        orgs,
        selectedOrg,
        setSelectedOrg,
        searchQuery,
        setSearchQuery,
        selectedStatus,
        setSelectedStatus,
        statusCounts,
        selectedGate,
        openReport,
        setOpenReport,
        openHistory,
        setOpenHistory,
        handleReportClick,
        handleHistoryClick,
        handleReportSuccess,
        getOrgNames,
        refresh: () => fetchGates(true)
    };
};

export default useStationSluiceGateSummary;
