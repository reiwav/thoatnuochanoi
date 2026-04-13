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
import { IconEdit, IconTrash, IconPlus, IconHistory } from '@tabler/icons-react';
import pumpingStationApi from 'api/pumpingStation';
import organizationApi from 'api/organization';
import PumpingStationDialog from './PumpingStationDialog';
import PumpingStationHistoryDialog from './PumpingStationHistoryDialog';
import PumpingStationReport from './PumpingStationReport';
import { toast } from 'react-hot-toast';
import { CircularProgress, Box, Typography } from '@mui/material';
import useAuthStore from 'store/useAuthStore';

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
                promises.push(pumpingStationApi.list());
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
                            <TableCell>Số TT</TableCell>
                            <TableCell>Tên trạm bơm</TableCell>
                            <TableCell>Địa chỉ</TableCell>
                            <TableCell>Số lượng bơm</TableCell>
                            <TableCell>Tự động</TableCell>
                            <TableCell>Đơn vị quản lý</TableCell>
                            <TableCell>Đơn vị phối hợp</TableCell>
                            <TableCell align="center">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(data || []).map((item, index) => (
                            <TableRow key={item.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                                <TableCell>{item.address}</TableCell>
                                <TableCell>{item.pump_count}</TableCell>
                                <TableCell>{item.is_auto ? 'Có' : 'Không'}</TableCell>
                                <TableCell>{getOrgNames(item.org_id)}</TableCell>
                                <TableCell>{getOrgNames(item.shared_org_ids)}</TableCell>
                                <TableCell align="center">
                                    <Stack direction="row" spacing={1} justifyContent="center">
                                        <Tooltip title="Lịch sử vận hành">
                                            <IconButton color="info" onClick={() => handleHistory(item)}>
                                                <IconHistory size="20" />
                                            </IconButton>
                                        </Tooltip>
                                        {hasPermission('trambom:edit') && (
                                            <Tooltip title="Chỉnh sửa">
                                                <IconButton color="primary" onClick={() => handleEdit(item)}>
                                                    <IconEdit size="20" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {hasPermission('trambom:delete') && (
                                            <Tooltip title="Xóa">
                                                <IconButton color="error" onClick={() => handleDelete(item.id)}>
                                                    <IconTrash size={20} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                </TableCell>
                            </TableRow>
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
