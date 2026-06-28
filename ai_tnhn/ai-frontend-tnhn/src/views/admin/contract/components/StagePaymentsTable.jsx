import React from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell, Box, Button, Stack, Typography } from '@mui/material';
import { IconFileText } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { getScanFileName } from '../utils';

const StagePaymentsTable = ({ stage }) => {
    if (!stage.payment_records || stage.payment_records.length === 0) {
        return (
            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', pl: 1, fontSize: '0.75rem' }}>
                Chưa có hồ sơ thanh toán cho giai đoạn này.
            </Typography>
        );
    }

    return (
        <Box>
            <Table size="small" sx={{ bgcolor: 'white', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '8px', overflow: 'hidden' }}>
                <TableHead sx={{ bgcolor: '#f0fdf4', borderBottom: '2px solid #bbf7d0' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#15803d' }}>Tiêu đề thanh toán</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#15803d' }}>Ngày thanh toán</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#15803d' }}>Nội dung</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#15803d' }}>Bản scan đính kèm</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {stage.payment_records.map((rec, recIdx) => (
                        <TableRow key={recIdx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>{rec.title}</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem', color: 'text.secondary' }}>
                                {rec.date ? dayjs(rec.date).format('DD/MM/YYYY') : '---'}
                            </TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.72rem', fontStyle: rec.content ? 'normal' : 'italic', color: rec.content ? 'text.primary' : 'text.secondary' }}>
                                {rec.content || '---'}
                            </TableCell>
                             <TableCell sx={{ py: 0.5 }}>
                                 <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                                     {rec.scan_files?.map((link, fileIdx) => (
                                         <Button
                                             key={fileIdx}
                                             variant="text"
                                             size="small"
                                             startIcon={<IconFileText size={10} />}
                                             href={link.startsWith('http') ? link : (import.meta.env?.VITE_APP_API_URL || '') + (link.startsWith('local:') ? '/api/storage/file/' + link.substring(6) : link)}
                                             target="_blank"
                                             sx={{ 
                                                 textTransform: 'none', 
                                                 fontSize: '0.65rem', 
                                                 py: 0.25, 
                                                 px: 0.75, 
                                                 borderRadius: '4px',
                                                 color: '#15803d',
                                                 bgcolor: '#f0fdf4',
                                                 '&:hover': { bgcolor: '#dcfce7' }
                                             }}
                                         >
                                                 {getScanFileName(link, `Scan #${fileIdx + 1}`)}
                                             </Button>
                                         ))}
                                 </Stack>
                             </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
};

export default StagePaymentsTable;
