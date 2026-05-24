import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Grid,
  Stack,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  useMediaQuery,
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconX, IconClock, IconMapPin, IconBuilding, IconAlertTriangle, IconCalendar } from '@tabler/icons-react';
import dayjs from 'dayjs';

import inundationApi from 'api/inundation';
import InundationDetailDialog from './InundationDetailDialog';

const InundationHistoryDialog = ({ open, onClose, point }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadHistory = useCallback(async () => {
    if (!point || !open) return;

    const pid = point.id || point.point_id;
    if (!pid) return;

    setLoading(true);
    try {
      const currentYear = dayjs().year();
      const now = dayjs().unix();

      // Gọi yearly history - đây là nguồn dữ liệu đáng tin cậy nhất
      const res = await inundationApi.getYearlyHistory(currentYear);
      const rawReports = Array.isArray(res) ? res : res?.data?.data || [];

      // Lọc các đợt ngập theo point_id
      let filtered = rawReports.filter((r) => r.point_id === pid);

      // Fallback: tìm theo tên đường nếu không có kết quả
      if (filtered.length === 0) {
        const name = point.street_name || point.name;
        if (name) filtered = rawReports.filter((r) => r.street_name === name);
      }

      // Tính duration và sắp xếp mới nhất lên trên
      const processed = filtered
        .map((item) => {
          const startTime = item.created_at || item.start_time;
          const endTime = item.end_time > 0 ? item.end_time : now;
          return { ...item, durationSeconds: startTime ? Math.max(0, endTime - startTime) : 0 };
        })
        .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

      setHistory(processed);
    } catch (err) {
      console.error('Failed to load point history:', err);
    } finally {
      setLoading(false);
    }
  }, [point, open]);

  useEffect(() => {
    setHistory([]);
    loadHistory();
  }, [loadHistory]);

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0 ph';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}ph`;
    return `${m}ph`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: isMobile ? 0 : 4,
            m: isMobile ? 0 : 2,
            maxHeight: isMobile ? '100%' : '90vh',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)'
          }
        }
      }}
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ m: 0, p: 2.5, bgcolor: '#ffffff', borderBottom: '1px solid', borderColor: 'grey.100', position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.lighter', color: 'primary.main', display: 'flex' }}>
              <IconCalendar size={22} />
            </Box>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 900, color: 'grey.900', letterSpacing: '-0.02em' }}>
                Lịch sử ngập lụt
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500 }}>
                Chi tiết lịch sử ngập theo năm tại vị trí trạm
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} sx={{ color: 'grey.400', '&:hover': { color: 'grey.900', bgcolor: 'grey.100' } }}>
            <IconX size={20} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack spacing={3}>
          <Box>
            <Grid container spacing={2}>
              {/* Card 1: Địa chỉ */}
              <Grid item xs={12} md={6}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'grey.50',
                    borderColor: 'grey.200',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.3s',
                    '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }
                  }}
                >
                  <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: 'primary.lighter', color: 'primary.main', display: 'flex' }}>
                    <IconMapPin size={24} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}
                    >
                      Tên điểm / Địa chỉ
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        mt: 0.25,
                        color: 'grey.900',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {point?.name || '...'}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {point?.address || '...'}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* Card 2: Đơn vị */}
              <Grid item xs={6} md={3}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'grey.50',
                    borderColor: 'grey.200',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.3s',
                    '&:hover': { borderColor: 'secondary.main', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }
                  }}
                >
                  <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: 'secondary.lighter', color: 'secondary.main', display: 'flex' }}>
                    <IconBuilding size={24} />
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}
                    >
                      Đơn vị quản lý
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25, color: 'grey.900' }}>
                      {point?.org_name || point?.org_code || '...'}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* Card 3: Số lần ngập */}
              <Grid item xs={6} md={3}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'error.lighter',
                    borderColor: 'error.light',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.3s',
                    '&:hover': { boxShadow: '0 6px 16px rgba(211,47,47,0.08)' }
                  }}
                >
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 2.5,
                      bgcolor: 'error.main',
                      color: 'white',
                      display: 'flex',
                      boxShadow: '0 4px 10px rgba(211,47,47,0.2)'
                    }}
                  >
                    <IconAlertTriangle size={24} />
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      color="error.dark"
                      sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}
                    >
                      Số lần ngập
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 950, mt: 0.25, color: 'error.main' }}>
                      {point?.count || history.length} lần
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} color="secondary" />
            </Box>
          ) : history.length === 0 ? (
            <Typography align="center" color="textSecondary" sx={{ py: 4 }}>
              Chưa có dữ liệu lịch sử cho điểm ngập này
            </Typography>
          ) : (
            <>
              {/* Desktop Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f3f4' }}>
                    <TableRow>
                      <TableCell align="center" sx={{ fontWeight: 700, width: '80px' }}>
                        Đợt
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Bắt đầu</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Kết thúc</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: '120px' }}>
                        Trạng thái
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        Thời gian ngập
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: '100px' }}>
                        Thao tác
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((event, idx) => {
                      const isFlooding = !event.end_time || event.end_time === 0;
                      return (
                        <TableRow key={event.id} hover>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>
                            #{history.length - idx}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <IconClock size={16} color="#666" />
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {dayjs.unix(event.created_at || event.start_time).format('DD/MM/YYYY HH:mm')}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <IconClock size={16} color="#666" />
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {isFlooding ? (
                                  <span style={{ color: '#d32f2f', fontWeight: 600 }}>Đang ngập...</span>
                                ) : (
                                  dayjs.unix(event.end_time).format('DD/MM/YYYY HH:mm')
                                )}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={isFlooding ? 'Đang ngập' : 'Đã hết ngập'}
                              color={isFlooding ? 'error' : 'success'}
                              size="small"
                              sx={{ fontWeight: 800, borderRadius: '6px' }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>
                            {formatDuration(event.durationSeconds)}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setSelectedEvent(event);
                                setDetailOpen(true);
                              }}
                              sx={{ borderRadius: '6px', fontSize: '0.75rem', py: 0 }}
                            >
                              Xem
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Mobile Cards */}
              <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
                {history.map((event, idx) => {
                  const isFlooding = !event.end_time || event.end_time === 0;
                  return (
                    <Paper key={event.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          #{history.length - idx}
                        </Typography>
                        <Chip
                          label={isFlooding ? 'Đang ngập' : 'Đã hết ngập'}
                          color={isFlooding ? 'error' : 'success'}
                          size="small"
                          sx={{ fontWeight: 800, borderRadius: '6px' }}
                        />
                      </Box>
                      <Stack spacing={1}>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontWeight: 700 }}>Bắt đầu:</span>
                          {dayjs.unix(event.created_at || event.start_time).format('DD/MM/YYYY HH:mm')}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontWeight: 700 }}>Kết thúc:</span>
                          {isFlooding ? (
                            <span style={{ color: '#d32f2f', fontWeight: 700 }}>Đang ngập...</span>
                          ) : (
                            dayjs.unix(event.end_time).format('DD/MM/YYYY HH:mm')
                          )}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            <span style={{ fontWeight: 500, fontSize: '0.75rem', marginRight: 4 }}>Tổng:</span>
                            {formatDuration(event.durationSeconds)}
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setSelectedEvent(event);
                              setDetailOpen(true);
                            }}
                          >
                            Xem
                          </Button>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>

      {detailOpen && selectedEvent && (
        <InundationDetailDialog
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          point={{
            id: selectedEvent.point_id || point?.id || point?.point_id,
            name: point?.name || point?.street_name,
            address: point?.address,
            report_id: selectedEvent.id
          }}
        />
      )}
    </Dialog>
  );
};

export default InundationHistoryDialog;
