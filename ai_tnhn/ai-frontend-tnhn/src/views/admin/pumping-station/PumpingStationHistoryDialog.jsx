import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import pumpingStationApi from 'api/pumpingStation';
import dayjs from 'dayjs';

const PumpingStationHistoryDialog = ({ open, handleClose, station }) => {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (open && station) {
            loadHistory();
        }
    }, [open, station]);

    const loadHistory = async () => {
        try {
            const response = await pumpingStationApi.getHistory(station.id);
            setHistory(response.data.data?.data || []);
        } catch (error) {
            console.error('Failed to load history', error);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
            <DialogTitle dividers>Lịch sử vận hành: {station?.name}</DialogTitle>
            <DialogContent dividers>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Thời gian</TableCell>
                                <TableCell>Nhân viên</TableCell>
                                <TableCell align="center">Vận hành</TableCell>
                                <TableCell align="center">Đóng</TableCell>
                                <TableCell align="center">Bảo dưỡng</TableCell>
                                <TableCell>Ghi chú</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(history || []).length > 0 ? (
                                (history || []).map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{dayjs(row.timestamp * 1000).format('DD/MM/YYYY HH:mm')}</TableCell>
                                        <TableCell>{row.user_name}</TableCell>
                                        <TableCell align="center" style={{ color: 'green' }}>{row.operating_count}</TableCell>
                                        <TableCell align="center" style={{ color: 'red' }}>{row.closed_count}</TableCell>
                                        <TableCell align="center" style={{ color: 'orange' }}>{row.maintenance_count}</TableCell>
                                        <TableCell>{row.note}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">Chưa có dữ liệu báo cáo</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};

export default PumpingStationHistoryDialog;
