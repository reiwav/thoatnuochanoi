import React from 'react';
import { TableRow, TableCell, Box, Typography, useTheme } from '@mui/material';
import { IconInbox } from '@tabler/icons-react';

const HistoryEmptyState = ({ colSpan }) => {
    const theme = useTheme();

    return (
        <TableRow>
            <TableCell colSpan={colSpan} align="center" sx={{ py: 8 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <IconInbox size={48} color={theme.palette.text.disabled} />
                    <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 800 }}>
                        Chưa có bản tin lịch sử nào
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                        Dữ liệu báo cáo vận hành của trạm sẽ được lưu trữ và hiển thị tại đây
                    </Typography>
                </Box>
            </TableCell>
        </TableRow>
    );
};

export default HistoryEmptyState;
