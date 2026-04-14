import React, { useState, useEffect } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { IconEdit, IconTrash, IconPlus, IconHistory, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { CircularProgress, Box, Typography, Collapse, Grid, Divider } from '@mui/material';
import pumpingStationApi from 'api/pumpingStation';
import organizationApi from 'api/organization';
import PumpingStationDialog from './PumpingStationDialog';
import PumpingStationHistoryDialog from './PumpingStationHistoryDialog';
import PumpingStationReport from './PumpingStationReport';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';

const PumpingStationRow = ({ item, index, getOrgNames, handleHistory, handleEdit, handleDelete, hasPermission }) => {
    const [open, setOpen] = useState(!!item.last_report);
    const lastReport = item.last_report;

    return (
        <>
            <TableRow sx={{ '& > *': { borderBottom: lastReport ? '1px dashed' : 'inherit', borderColor: 'divider' } }}>
                <TableCell>
                    {lastReport && (
                        <IconButton size="small" onClick={() => setOpen(!open)}>
                            {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                        </IconButton>
                    )}
                </TableCell>
                <TableCell>{index + 1}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                <TableCell>{item.address || '-'}</TableCell>
                <TableCell>{item.pump_count}</TableCell>
                <TableCell>{item.is_auto ? 'Có' : 'Không'}</TableCell>
                <TableCell>{getOrgNames(item.org_id)}</TableCell>
                <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Lịch sử vận hành">
                            <IconButton color="info" onClick={() => handleHistory(item)}>
                                <IconHistory size="18" />
                            </IconButton>
                        </Tooltip>
                        {hasPermission('trambom:edit') && (
                            <Tooltip title="Chỉnh sửa">
                                <IconButton color="primary" onClick={() => handleEdit(item)}>
                                    <IconEdit size="18" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {hasPermission('trambom:delete') && (
                            <Tooltip title="Xóa">
                                <IconButton color="error" onClick={() => handleDelete(item.id)}>
                                    <IconTrash size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </TableCell>
            </TableRow>
            {lastReport && (
                <TableRow>
                    <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 0 }} colSpan={8}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ my: 2, mx: 1, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
                                Trạng thái vận hành mới nhất
                            </Typography>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={4}>
                                        <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'success.light', textAlign: 'center' }}>
                                            <Typography variant="caption" color="success.main" sx={{ fontWeight: 800, display: 'block' }}>VẬN HÀNH</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.operating_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'error.light', textAlign: 'center' }}>
                                            <Typography variant="caption" color="error.main" sx={{ fontWeight: 800, display: 'block' }}>ĐANG ĐÓNG</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.closed_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'warning.light', textAlign: 'center' }}>
                                            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 800, display: 'block' }}>BẢO DƯỠNG</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{lastReport.maintenance_count}</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                                        <Grid container sx={{ mt: 1 }}>
                                            <Grid item xs={12} sm={8}>
                                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block' }}>GHI CHÚ:</Typography>
                                                <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                                    {lastReport.note ? `"${lastReport.note}"` : '(Không có ghi chú)'}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={4} sx={{ textAlign: { sm: 'right' }, mt: { xs: 2, sm: 0 } }}>
                                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'text.secondary' }}>
                                                     Cập nhật: {dayjs(lastReport.timestamp * 1000).format('DD/MM/YYYY HH:mm')}
                                                </Typography>
                                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'text.disabled' }}>
                                                    Bởi: {lastReport.user_name}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        )}
        </>
    );
};

const PumpingStationPage = () => {
    const { user: userInfo, hasPermission } = useAuthStore();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assignedStation, setAssignedStation] = useState(null);
    const [open, setOpen] = useState(false);
    const [openHistory, setOpenHistory] = useState(false);
    const [selected, setSelected] = useState(null);
    const [orgs, setOrgs] = useState({ primary: [], shared: [] });

    const isAdmin = hasPermission('trambom:view');

    const loadData = async () => {
        try {
            setLoading(true);
            const promises = [];
            
            if (isAdmin) {
                promises.push(pumpingStationApi.list({ per_page: 1000 }));
            } else if (userInfo?.assigned_pumping_station_id) {
                promises.push(pumpingStationApi.get(userInfo.assigned_pumping_station_id));
            }
            
            promises.push(organizationApi.getSelectionList());

            const results = await Promise.all(promises);
            
            if (isAdmin) {
                const stRes = results[0];
                setData(stRes.data.data?.data || []);
            } else if (userInfo?.assigned_pumping_station_id) {
                const stRes = results[0];
                setAssignedStation(stRes.data.data || null);
            }

            const orgRes = results[results.length - 1];
            if (orgRes.data?.status === 'success') {
                setOrgs(orgRes.data.data || { primary: [], shared: [] });
            }
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAdd = () => {
        setSelected(null);
        setOpen(true);
    };

    const handleEdit = (item) => {
        setSelected(item);
        setOpen(true);
    };

    const handleHistory = (item) => {
        setSelected(item);
        setOpenHistory(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa trạm bơm này?')) {
            try {
                await pumpingStationApi.delete(id);
                loadData();
                toast.success('Xóa thành công');
            } catch (error) {
                toast.error('Xóa thất bại');
            }
        }
    };

    const getOrgNames = (ids) => {
        if (!ids) return '';
        const idList = Array.isArray(ids) ? ids : [ids];
        const allOrgs = [...(orgs.primary || []), ...(orgs.shared || [])];
        return idList
            .map((id) => allOrgs.find((o) => o.id === id)?.name)
            .filter((name) => !!name)
            .join(', ');
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;

    if (!isAdmin) {
        if (!assignedStation) return <Box sx={{ p: 3 }}><Typography color="error">Bạn chưa được gán vào trạm bơm nào. Vui lòng liên hệ quản lý.</Typography></Box>;
        return <PumpingStationReport station={assignedStation} />;
    }

    return (
        <MainCard
            title="QUẢN LÝ TRẠM BƠM"
            secondary={
                hasPermission('trambom:edit') && (
                    <Button variant="contained" startIcon={<IconPlus />} onClick={handleAdd}>
                        Thêm trạm bơm
                    </Button>
                )
            }
        >
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 40 }} />
                            <TableCell>STT</TableCell>
                            <TableCell>Tên trạm bơm</TableCell>
                            <TableCell>Địa chỉ</TableCell>
                            <TableCell>Số lượng bơm</TableCell>
                            <TableCell>Tự động</TableCell>
                            <TableCell>Đơn vị quản lý</TableCell>
                            <TableCell align="center">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(data || []).map((item, index) => (
                            <PumpingStationRow
                                key={item.id}
                                item={item}
                                index={index}
                                getOrgNames={getOrgNames}
                                handleHistory={handleHistory}
                                handleEdit={handleEdit}
                                handleDelete={handleDelete}
                                hasPermission={hasPermission}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <PumpingStationDialog
                open={open}
                handleClose={() => setOpen(false)}
                item={selected}
                refresh={loadData}
                organizations={orgs}
            />

            {selected && (
                <PumpingStationHistoryDialog
                    open={openHistory}
                    handleClose={() => setOpenHistory(false)}
                    station={selected}
                />
            )}
        </MainCard>
    );
};

export default PumpingStationPage;
