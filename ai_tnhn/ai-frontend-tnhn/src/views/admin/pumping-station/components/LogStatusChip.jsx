import React from 'react';
import { Stack, Chip } from '@mui/material';

const LogStatusChip = ({ report }) => {
    if (!report) return <Chip label="Chưa có dữ liệu" size="small" variant="outlined" sx={{ fontWeight: 700 }} />;
    return (
        <Stack direction="row" spacing={0.5}>
            {report.operating_count > 0 && <Chip label={`Vận hành: ${report.operating_count}`} size="small" color="error" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />}
            {report.closed_count > 0 && <Chip label={`Dừng: ${report.closed_count}`} size="small" color="success" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />}
            {report.maintenance_count > 0 && <Chip label={`Bảo dưỡng: ${report.maintenance_count}`} size="small" color="warning" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }} />}
            {report.no_signal_count > 0 && <Chip label={`Ko tín hiệu: ${report.no_signal_count}`} size="small" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem', bgcolor: 'grey.300' }} />}
        </Stack>
    );
};

export default React.memo(LogStatusChip);
