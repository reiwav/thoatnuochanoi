import React from 'react';
import {
  Typography,
  Stack,
  IconButton,
  Tooltip,
  alpha
} from '@mui/material';
import {
  IconRefresh,
  IconLayoutDashboard
} from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';

// Components
import EmployeeActionDialog from '../../employee/components/EmployeeActionDialog';
import InundationDetailDialog from '../../shared/inundation/InundationDetailDialog';
import InundationHistoryDialog from '../../shared/inundation/InundationHistoryDialog';
import ImageViewer from './components/ImageViewer';

// Extracted Components
import InundationFilterBar from './components/InundationFilterBar';
import ConfirmQuickFinishDialog from './components/ConfirmQuickFinishDialog';
import InundationHeaderChips from './components/InundationHeaderChips';
import InundationPointsGrid from './components/InundationPointsGrid';

// Custom hook
import useAdminInundation from './hooks/useAdminInundation';

const AdminInundationDashboard = () => {
  const {
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
  } = useAdminInundation();

  return (
    <MainCard
      contentSX={{ px: { xs: 0, sm: 2.5 } }}
      sx={{ mx: { xs: -2, sm: 0 }, borderRadius: { xs: 0, sm: 4 }, border: { xs: 'none', sm: '1px solid' }, borderColor: 'divider' }}
      title={
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconLayoutDashboard size={isMobile ? 20 : 24} color={theme.palette.primary.main} />
          <Typography variant={isMobile ? 'h4' : 'h3'} sx={{ fontWeight: 800 }}>
            {isMobile ? 'ĐIỂM NGẬP' : 'QUẢN LÝ ĐIỂM NGẬP'}
          </Typography>
        </Stack>
      }
      secondary={
        <Stack direction="row" spacing={1} alignItems="center">
          <InundationHeaderChips
            isMobile={isMobile}
            floodLevels={floodLevels}
            levelCounts={levelCounts}
            floodedCount={floodedCount}
            normalCount={normalCount}
            theme={theme}
            selectedStatus={filters.statusFilter}
            onStatusChange={(status) => setFilters({ statusFilter: status })}
            totalCount={points.length}
          />
          <Tooltip title="Làm mới dữ liệu">
            <IconButton
              color="primary"
              onClick={() => fetchPoints()}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                borderRadius: 2,
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
              }}
            >
              <IconRefresh size={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      {/* Filter Bar */}
      <InundationFilterBar
        filters={filters}
        setFilters={setFilters}
        floodLevels={floodLevels}
      />

      <InundationPointsGrid
        loading={loading}
        filteredPoints={filteredPoints}
        onAction={handleAction}
        onOpenViewer={handleOpenViewer}
        onOpenDetail={handleOpenDetail}
        onOpenHistory={handleOpenHistory}
        navigate={navigate}
        basePath={basePath}
      />

      <ImageViewer
        viewer={viewer}
        onClose={() => setViewer({ ...viewer, open: false })}
        onPrev={() => setViewer((v) => ({ ...v, index: (v.index - 1 + v.images.length) % v.images.length }))}
        onNext={() => setViewer((v) => ({ ...v, index: (v.index + 1) % v.images.length }))}
      />

      <InundationDetailDialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, point: null })}
        point={detailDialog.point}
      />

      <InundationHistoryDialog
        open={historyDialog.open}
        onClose={() => setHistoryDialog({ open: false, point: null })}
        point={historyDialog.point}
      />

      <EmployeeActionDialog
        open={taskDialog.open}
        mode={taskDialog.mode}
        data={taskDialog.data}
        onClose={() => setTaskDialog({ ...taskDialog, open: false })}
        onFinished={() => {
          setTaskDialog({ ...taskDialog, open: false });
          fetchPoints();
        }}
      />

      {/* Confirm Quick Finish Dialog */}
      <ConfirmQuickFinishDialog
        open={confirmFinish.open}
        onClose={() => setConfirmFinish({ open: false, point: null })}
        point={confirmFinish.point}
        onConfirm={handleConfirmQuickFinish}
      />
    </MainCard>
  );
};

export default AdminInundationDashboard;
