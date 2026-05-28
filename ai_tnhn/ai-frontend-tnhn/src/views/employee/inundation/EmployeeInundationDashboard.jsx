import { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Badge,
  Avatar,
  TextField,
  MenuItem,
  Paper,
  Skeleton,
  Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  IconSearch,
  IconAlertTriangle,
  IconUser,
  IconLogout
} from '@tabler/icons-react';

// Common Components
import EmployeeActionDialog from '../components/EmployeeActionDialog';
import InundationPointCard from './components/InundationPointCard';
import InundationHistoryCard from './components/InundationHistoryCard';
import ImageViewer from './components/ImageViewer';
import InundationDetailDialog from '../../shared/inundation/InundationDetailDialog';

// Hook
import useEmployeeInundationDashboard from './hooks/useEmployeeInundationDashboard';

const EmployeeInundationDashboard = () => {
  const theme = useTheme();
  const {
    userInfo,
    navigate,
    basePath,
    activeTab,
    historyReports,
    loading,
    loadingHistory,
    filters,
    setFilters,
    stats,
    filteredPoints,
    fetchPoints,
    viewer,
    setViewer,
    handleOpenViewer,
    taskDialog,
    setTaskDialog,
    openTask,
    detailDialog,
    setDetailDialog,
    handleOpenDetail,
    handleLogout
  } = useEmployeeInundationDashboard();

  const renderFilterBar = () => (
    <Box sx={{ mb: 2, px: { xs: 1, sm: 0 } }}>
      <TextField
        fullWidth
        placeholder="Tìm tên đường, địa chỉ..."
        value={filters.searchQuery}
        onChange={(e) => setFilters({ searchQuery: e.target.value })}
        slotProps={{
          input: {
            startAdornment: <IconSearch size={20} style={{ marginRight: 12, opacity: 0.6 }} />,
            sx: {
              borderRadius: 4,
              bgcolor: 'background.paper',
              boxShadow: theme.shadows[1],
              '&:hover': { boxShadow: theme.shadows[3] },
              '& .MuiOutlinedInput-notchedOutline': { border: '1px solid', borderColor: 'divider' }
            }
          }
        }}
      />
    </Box>
  );

  const renderPointList = () => {
    if (loading) {
      return (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 4 }} />
            </Grid>
          ))}
        </Grid>
      );
    }

    if (filteredPoints.length === 0) {
      return (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4" color="textSecondary" sx={{ mb: 1, fontWeight: 700 }}>
            Không tìm thấy kết quả
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Hãy thử tìm kiếm với từ khóa khác
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={2}>
        {filteredPoints.map((point) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={point.id}>
            <InundationPointCard
              point={point}
              openTask={openTask}
              handleOpenViewer={handleOpenViewer}
              onOpenDetail={handleOpenDetail}
              onRefresh={fetchPoints}
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box sx={{ px: { xs: 0.5, sm: 1.5 }, pt: 2, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: { xs: 1, sm: 0 } }}>
        <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main' }}>
          {activeTab === 2 ? 'Lịch sử' : activeTab === 3 ? 'Tài khoản' : 'Điểm trực ngập'}
        </Typography>
        <Badge badgeContent={stats.active} color="error">
          <Avatar sx={{ bgcolor: 'error.lighter', width: 40, height: 40 }}>
            <IconAlertTriangle size={22} color={theme.palette.error.main} />
          </Avatar>
        </Badge>
      </Box>

      {/* Content Area */}
      {activeTab === 2 ? (
        <Stack spacing={1.5}>
          {renderFilterBar()}
          {loadingHistory
            ? [1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 3 }} />)
            : historyReports.map((report) => (
                <InundationHistoryCard
                  key={report.id}
                  report={report}
                  isMobile
                  navigate={navigate}
                  basePath={basePath}
                  handleOpenViewer={handleOpenViewer}
                />
              ))}
        </Stack>
      ) : activeTab === 3 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
            <IconUser size={40} />
          </Avatar>
          <Typography variant="h3" sx={{ fontWeight: 900 }}>
            {userInfo?.name || 'Cán bộ kỹ thuật'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
            {userInfo?.email}
          </Typography>
          <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <MenuItem onClick={handleLogout} sx={{ py: 2, color: 'error.main' }}>
              <IconLogout style={{ marginRight: 12 }} /> <b>Đăng xuất</b>
            </MenuItem>
          </Paper>
        </Box>
      ) : (
        <Box>
          {renderFilterBar()}
          {renderPointList()}
        </Box>
      )}

      {/* Common Task Dialog */}
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
    </Box>
  );
};

export default EmployeeInundationDashboard;
