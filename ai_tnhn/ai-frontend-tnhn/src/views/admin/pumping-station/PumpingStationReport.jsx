import React, { useState, useEffect } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import pumpingStationApi from 'api/pumpingStation';
import { toast } from 'react-hot-toast';
import PumpingStationHistoryDialog from './PumpingStationHistoryDialog';

const PumpingStationReport = ({ station }) => {
    const [openHistory, setOpenHistory] = useState(false);
    const [formData, setFormData] = useState({
        operating_count: 0,
        closed_count: 0,
        maintenance_count: 0,
        note: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                station_id: station.id,
                operating_count: parseInt(formData.operating_count),
                closed_count: parseInt(formData.closed_count),
                maintenance_count: parseInt(formData.maintenance_count),
                note: formData.note
            };

            const total = payload.operating_count + payload.closed_count + payload.maintenance_count;
            if (total > station.pump_count) {
                toast.error(`Tổng số máy bơm (${total}) vượt quá định mức (${station.pump_count})`);
                return;
            }

            await pumpingStationApi.report(payload);
            toast.success('Gửi báo cáo thành công');
            setFormData({ operating_count: 0, closed_count: 0, maintenance_count: 0, note: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Báo cáo thất bại');
        }
    };

    return (
        <MainCard title={`BÁO CÁO VẬN HÀNH: ${station.name}`}>
            <Stack spacing={3}>
                <Alert severity="info">
                    Định mức trạm: <strong>{station.pump_count} máy bơm</strong>. 
                    Địa chỉ: {station.address}
                </Alert>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="Số lượng vận hành"
                            name="operating_count"
                            type="number"
                            value={formData.operating_count}
                            onChange={handleChange}
                            InputProps={{ inputProps: { min: 0 } }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="Số lượng đóng"
                            name="closed_count"
                            type="number"
                            value={formData.closed_count}
                            onChange={handleChange}
                            InputProps={{ inputProps: { min: 0 } }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="Số lượng bảo dưỡng"
                            name="maintenance_count"
                            type="number"
                            value={formData.maintenance_count}
                            onChange={handleChange}
                            InputProps={{ inputProps: { min: 0 } }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Ghi chú"
                            name="note"
                            multiline
                            rows={3}
                            value={formData.note}
                            onChange={handleChange}
                        />
                    </Grid>
                </Grid>
                <Stack direction="row" spacing={2}>
                    <Button variant="contained" size="large" fullWidth onClick={handleSubmit}>
                        Gửi báo cáo
                    </Button>
                    <Button variant="outlined" size="large" fullWidth onClick={() => setOpenHistory(true)}>
                        Xem lịch sử
                    </Button>
                </Stack>
            </Stack>

            <PumpingStationHistoryDialog
                open={openHistory}
                handleClose={() => setOpenHistory(false)}
                station={station}
            />
        </MainCard>
    );
};

export default PumpingStationReport;
