import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useInundationStore from 'store/useInundationStore';

const useAdminInundation = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const basePath = '/admin';

  const { points, floodLevels, loading, fetchInitialData, fetchPoints, filters, setFilters, quickFinishPoint } = useInundationStore();

  // Local UI states
  const [viewer, setViewer] = useState({ open: false, images: [], index: 0 });
  const [taskDialog, setTaskDialog] = useState({ open: false, mode: '', data: null });
  const [confirmFinish, setConfirmFinish] = useState({ open: false, point: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, point: null });
  const [historyDialog, setHistoryDialog] = useState({ open: false, point: null });

  // Initial Fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fallback polling (60s) if SSE is down
  useEffect(() => {
    const interval = setInterval(() => {
      const isSseConnected = useInundationStore.getState().sseConnected;
      if (!isSseConnected) {
        fetchPoints();
      }
    }, 60000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Function to match a point to its corresponding flood level from config
  const getPointFloodLevel = (point) => {
    if (!point.report_id) {
      return floodLevels.find((l) => !l.is_flooding) || null;
    }
    const depth = point.last_report?.depth || 0;
    let matchedLevel = floodLevels.find((l) => l.is_flooding && depth >= l.min_depth && depth < l.max_depth);
    if (!matchedLevel) {
      matchedLevel = floodLevels.find((l) => l.name === point.last_report?.flood_level_name);
    }
    if (!matchedLevel) {
      matchedLevel = floodLevels.find((l) => l.is_flooding);
    }
    return matchedLevel || null;
  };

  const levelCounts = useMemo(() => {
    const counts = {};
    floodLevels.forEach((level) => {
      counts[level.code] = 0;
    });

    points.forEach((point) => {
      const matchedLevel = getPointFloodLevel(point);
      if (matchedLevel) {
        counts[matchedLevel.code] = (counts[matchedLevel.code] || 0) + 1;
      }
    });
    return counts;
  }, [points, floodLevels]);

  const floodedCount = useMemo(() => points.filter((p) => !!p.report_id).length, [points]);
  const normalCount = useMemo(() => points.length - floodedCount, [points, floodedCount]);

  const filteredPoints = useMemo(() => {
    let result = points;

    if (filters.statusFilter !== 'all') {
      const selectedLevel = floodLevels.find((l) => l.code === filters.statusFilter);
      if (selectedLevel) {
        result = result.filter((p) => {
          const matchedLevel = getPointFloodLevel(p);
          return matchedLevel?.code === selectedLevel.code;
        });
      } else {
        // Fallback for default filters
        if (filters.statusFilter === 'active') result = result.filter((p) => !!p.report_id);
        if (filters.statusFilter === 'normal') result = result.filter((p) => !p.report_id);
      }
    }

    if (filters.conditionFilter && filters.conditionFilter !== 'all') {
      const now = new Date();
      result = result.filter(p => {
        const report = p.last_report;
        if (!report) return false;

        const cond = filters.conditionFilter;

        if (cond === 'site_checked') {
          const reportTime = report.updated_at || report.created_at || report.start_time;
          if (!reportTime) return false;
          const reportDate = new Date(reportTime * 1000);
          return reportDate.toDateString() === now.toDateString();
        }

        if (cond === 'flooded_today') {
          const createdDate = new Date(report.created_at * 1000);
          return createdDate.toDateString() === now.toDateString();
        }

        let durationSeconds = 0;
        if (report.status === 'active') {
          durationSeconds = Math.floor(Date.now() / 1000) - report.created_at;
        } else if (report.status === 'resolved') {
          durationSeconds = report.end_time - report.created_at;
        }

        if (cond === 'flooded_1h') return durationSeconds > 3600;
        if (cond === 'flooded_2h') return durationSeconds > 7200;
        if (cond === 'flooded_4h') return durationSeconds > 14400;

        if (cond === 'flooded_overnight') {
          const createdDate = new Date(report.created_at * 1000);
          const compareDate = report.status === 'active' ? now : new Date(report.end_time * 1000);
          return createdDate.toDateString() !== compareDate.toDateString();
        }

        return true;
      });
    }

    if (filters.orgFilter !== 'all' && filters.orgFilter) {
      result = result.filter((p) => p.org_id === filters.orgFilter);
    }
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter((p) => p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      // 1. Sort by flooding status
      if (a.report_id && !b.report_id) return -1;
      if (!a.report_id && b.report_id) return 1;

      // 2. Sort by latest report update time for BOTH flooding and normal points
      const timeA = a.last_report?.updated_at || a.last_report?.created_at || a.last_report?.start_time || 0;
      const timeB = b.last_report?.updated_at || b.last_report?.created_at || b.last_report?.start_time || 0;

      if (timeA !== timeB) {
        return timeB - timeA; // Descending (newest first)
      }

      // 3. Fallback to alphabetical sorting
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [points, filters, floodLevels]);

  const handleOpenViewer = (imgs, idx = 0) => setViewer({ open: true, images: imgs, index: idx });
  const handleOpenDetail = (point) => setDetailDialog({ open: true, point });
  const handleOpenHistory = (point) => setHistoryDialog({ open: true, point });

  const handleAction = (mode, point) => {
    if (mode === 'quick_finish') {
      setConfirmFinish({ open: true, point });
      return;
    }

    const modeMap = {
      comment: 'REVIEW',
      report: 'REPORT',
      report_enterprise: 'REPORT_ENTERPRISE',
      survey: 'SURVEY',
      mech: 'MECH'
    };

    setTaskDialog({
      open: true,
      mode: modeMap[mode],
      data: point
    });
  };

  const handleConfirmQuickFinish = async () => {
    if (confirmFinish.point) {
      await quickFinishPoint(confirmFinish.point.id);
      setConfirmFinish({ open: false, point: null });
    }
  };

  return {
    theme,
    navigate,
    isMobile,
    basePath,
    points,
    floodLevels,
    loading,
    fetchPoints,
    filters,
    setFilters,
    viewer,
    setViewer,
    taskDialog,
    setTaskDialog,
    confirmFinish,
    setConfirmFinish,
    detailDialog,
    setDetailDialog,
    historyDialog,
    setHistoryDialog,
    levelCounts,
    floodedCount,
    normalCount,
    filteredPoints,
    handleOpenViewer,
    handleOpenDetail,
    handleOpenHistory,
    handleAction,
    handleConfirmQuickFinish
  };
};

export default useAdminInundation;
