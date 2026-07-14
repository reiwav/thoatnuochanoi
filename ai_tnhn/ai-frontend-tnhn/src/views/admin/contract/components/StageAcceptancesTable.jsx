import React from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell, Box, Button, Stack, Menu, MenuItem, Typography } from '@mui/material';
import { IconFileText } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { getScanFileName } from '../utils';

const StageAcceptancesTable = ({ 
    stage, 
    handleBbntStatusClick, 
    handleBbntStatusClose, 
    isBbntMenuOpen, 
    bbntAnchorEl, 
    handleUpdateBbntStatus 
}) => {
    if (!stage.acceptance_records || stage.acceptance_records.length === 0) {
        return (
            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', pl: 1, fontSize: '0.75rem' }}>
                Chưa có hồ sơ nghiệm thu cho giai đoạn này.
            </Typography>
        );
    }

    return (
        <Box>
            <Table size="small" sx={{ bgcolor: 'white', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '8px', overflow: 'hidden' }}>
                <TableHead sx={{ bgcolor: '#eff6ff', borderBottom: '2px solid #bfdbfe' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#1d4ed8' }}>Tiêu đề nghiệm thu</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#1d4ed8' }}>Ngày nghiệm thu</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#1d4ed8' }}>Nội dung</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#1d4ed8' }}>Trạng thái</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#1d4ed8' }}>Bản scan đính kèm</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {stage.acceptance_records.map((rec, recIdx) => {
                        const label = rec.status || 'Đã ký';
                        let color = '#15803d';
                        let bgcolor = '#f0fdf4';
                        let border = '1px solid #bbf7d0';
                        if (rec.status === 'Chưa ký') {
                            color = '#4b5563';
                            bgcolor = '#f3f4f6';
                            border = '1px solid #d1d5db';
                        }
                        return (
                            <TableRow key={recIdx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell sx={{ py: 0.75, fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>{rec.title}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.75rem', color: 'text.secondary' }}>
                                    {rec.date ? dayjs(rec.date).format('DD/MM/YYYY') : '---'}
                                </TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.72rem', fontStyle: rec.content ? 'normal' : 'italic', color: rec.content ? 'text.primary' : 'text.secondary' }}>
                                    {rec.content || '---'}
                                </TableCell>
                                <TableCell sx={{ py: 0.75 }}>
                                    <Box 
                                        onClick={(e) => handleBbntStatusClick(e, recIdx)}
                                        sx={{ 
                                            px: 1, 
                                            py: 0.15, 
                                            borderRadius: '10px', 
                                            fontSize: '0.65rem', 
                                            fontWeight: 700, 
                                            bgcolor, 
                                            color, 
                                            border, 
                                            display: 'inline-flex', 
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            '&:hover': {
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                                                transform: 'scale(1.03)',
                                                borderColor: color
                                            }
                                        }}
                                    >
                                        <span style={{ display: 'inline-block', lineHeight: 1 }}>{label}</span>
                                        <span style={{ fontSize: '0.5rem', marginLeft: '3px', opacity: 0.8 }}>▼</span>
                                    </Box>
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
                                                     color: '#1d4ed8',
                                                     bgcolor: '#eff6ff',
                                                     '&:hover': { bgcolor: '#dbeafe' }
                                                 }}
                                             >
                                                 {getScanFileName(link, `Scan #${fileIdx + 1}`)}
                                             </Button>
                                         ))}
                                     </Stack>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <Menu
                anchorEl={bbntAnchorEl}
                open={isBbntMenuOpen}
                onClose={handleBbntStatusClose}
                sx={{
                    '& .MuiPaper-root': {
                        borderRadius: '8px',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                        mt: 0.5
                    }
                }}
            >
                <MenuItem onClick={(e) => handleUpdateBbntStatus('Chưa ký', e)} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', '&:hover': { bgcolor: '#f3f4f6' } }}>Chưa ký</MenuItem>
                <MenuItem onClick={(e) => handleUpdateBbntStatus('Đã ký', e)} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', '&:hover': { bgcolor: '#f0fdf4' } }}>Đã ký</MenuItem>
            </Menu>
        </Box>
    );
};

export default StageAcceptancesTable;
