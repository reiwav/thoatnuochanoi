import React from 'react';
import { 
    TableHead, TableRow, TableCell, Stack, alpha, useTheme 
} from '@mui/material';
import { 
    IconClock, IconUser, IconPlayerPlay, 
    IconPlayerStop, IconTools, IconWifiOff 
} from '@tabler/icons-react';

const HistoryTableHead = ({ isPumping }) => {
    const theme = useTheme();

    return (
        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
            <TableRow>
                <TableCell sx={{ fontWeight: 800, color: 'text.primary', width: 170, py: 1.5 }}>
                    <Stack direction="row" spacing={0.8} alignItems="center">
                        <IconClock size={16} />
                        <span>Thời gian</span>
                    </Stack>
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'text.primary', width: 180, py: 1.5 }}>
                    <Stack direction="row" spacing={0.8} alignItems="center">
                        <IconUser size={16} />
                        <span>Người gửi</span>
                    </Stack>
                </TableCell>
                {isPumping && (
                    <>
                        <TableCell align="center" sx={{ fontWeight: 800, color: theme.palette.error.main, width: 120, py: 1.5 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                <IconPlayerPlay size={15} />
                                <span>Vận hành</span>
                            </Stack>
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: theme.palette.success.main, width: 140, py: 1.5 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                <IconPlayerStop size={15} />
                                <span>Không vận hành</span>
                            </Stack>
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#B78103', width: 120, py: 1.5 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                <IconTools size={15} />
                                <span>Bảo dưỡng</span>
                            </Stack>
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: theme.palette.text.secondary, width: 120, py: 1.5 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                <IconWifiOff size={15} />
                                <span>Mất tín hiệu</span>
                            </Stack>
                        </TableCell>
                    </>
                )}
                <TableCell sx={{ fontWeight: 800, color: 'text.primary', py: 1.5 }}>
                    Ghi chú / Nhận xét
                </TableCell>
            </TableRow>
        </TableHead>
    );
};

export default HistoryTableHead;
