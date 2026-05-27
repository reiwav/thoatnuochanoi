import { useState, useEffect, useCallback, useMemo } from 'react';
import { Typography, Stack } from '@mui/material';
import dayjs from 'dayjs';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import inundationApi from 'api/inundation';
import useAuthStore from 'store/useAuthStore';
import InundationHistoryDialog from '../../shared/inundation/InundationHistoryDialog';

// components
import InundationYearlyFilterBar from './components/InundationYearlyFilterBar';
import InundationYearlyTable from './components/InundationYearlyTable';
import InundationYearlyMobileList from './components/InundationYearlyMobileList';

const InundationYearlyHistory = () => {
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(dayjs().year());
  const [history, setHistory] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [selectedOrgId, setSelectedOrgId] = useState('');
  const { role, isCompany } = useAuthStore();
  const canFilterAllOrgs = role === 'super_admin' || isCompany;

  const years = [];
  for (let y = dayjs().year(); y >= 2024; y--) {
    years.push(y);
  }

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inundationApi.getYearlyHistory(year, selectedOrgId);
      setHistory(Array.isArray(res) ? res : res?.data?.data || res || []);
    } catch (err) {
      console.error('Failed to load yearly history:', err);
    } finally {
      setLoading(false);
    }
  }, [year, selectedOrgId]);

  const handleExport = async () => {
    try {
      const response = await inundationApi.exportYearlyHistory(year, selectedOrgId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `lich_su_ngap_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Helper to format duration (seconds) into "Xh Yph"
  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0 ph';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}ph`;
    return `${m}ph`;
  };

  // Aggregate data by Point
  const aggregatedData = useMemo(() => {
    const groups = {};
    const now = dayjs().unix();

    history.forEach((item) => {
      const id = item.point_id || item.street_name;
      if (!groups[id]) {
        groups[id] = {
          ...item,
          count: 0,
          total_duration: 0,
          events: []
        };
      }
      groups[id].count += 1;

      // If not resolved, use current time - created_at
      const endTime = item.end_time > 0 ? item.end_time : now;
      const durationSeconds = Math.max(0, endTime - item.created_at);

      groups[id].total_duration += durationSeconds;
      groups[id].events.push({
        ...item,
        durationSeconds
      });
    });

    // Sort events within each group by created_at descending
    Object.values(groups).forEach((group) => {
      group.events.sort((a, b) => b.created_at - a.created_at);
    });

    return Object.values(groups);
  }, [history]);

  const handleViewDetails = (point) => {
    setSelectedPoint(point);
    setDetailOpen(true);
  };

  return (
    <MainCard
      title={
        <Typography variant="h3" align="center" sx={{ textTransform: 'uppercase', py: 1 }}>
          Xem số liệu theo năm
        </Typography>
      }
    >
      <Stack spacing={3}>
        <InundationYearlyFilterBar
          year={year}
          onYearChange={setYear}
          years={years}
          canFilterAllOrgs={canFilterAllOrgs}
          selectedOrgId={selectedOrgId}
          onOrgChange={setSelectedOrgId}
          onExport={handleExport}
        />

        <InundationYearlyTable
          loading={loading}
          aggregatedData={aggregatedData}
          year={year}
          onViewDetails={handleViewDetails}
          formatDuration={formatDuration}
        />

        <InundationYearlyMobileList
          loading={loading}
          aggregatedData={aggregatedData}
          year={year}
          onViewDetails={handleViewDetails}
          formatDuration={formatDuration}
        />
      </Stack>

      <InundationHistoryDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        point={
          selectedPoint
            ? {
                id: selectedPoint.point_id,
                name: selectedPoint.street_name,
                address: selectedPoint.address,
                org_code: selectedPoint.org_code,
                org_name: selectedPoint.org_name,
                count: selectedPoint.count
              }
            : null
        }
      />
    </MainCard>
  );
};

export default InundationYearlyHistory;
