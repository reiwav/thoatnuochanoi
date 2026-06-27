import React from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell, Box, Button, Stack, Menu, MenuItem, Typography } from '@mui/material';
import { getFileUrl } from '../utils';

const StageAppendicesTable = ({ 
    stage, 
    handleAppStatusClick, 
    handleAppStatusClose, 
    isAppMenuOpen, 
    appAnchorEl, 
    handleUpdateAppStatus 
}) => {
    if (!stage.appendices || stage.appendices.length === 0) {
        return (
            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', pl: 1, fontSize: '0.75rem' }}>
                Chưa có phụ lục cho giai đoạn này.
            </Typography>
        );
    }

    return (
        <Box>
            <Table size="small" sx={{ bgcolor: 'white', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '8px', overflow: 'hidden' }}>
                <TableHead sx={{ bgcolor: '#fffbeb', borderBottom: '2px solid #fef08a' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#854d0e' }}>Số PL</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#854d0e' }}>Tên phụ lục</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#854d0e' }}>Nội dung</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#854d0e' }}>Trạng thái</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1, fontSize: '0.75rem', color: '#854d0e' }}>Tài liệu</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {stage.appendices.map((app, appIdx) => {
                        const label = app.status || 'Đã ký';
                        let color = '#15803d';
                        let bgcolor = '#f0fdf4';
                        let border = '1px solid #bbf7d0';
                        if (app.status === 'Hết hiệu lực') {
                            color = '#dc2626';
                            bgcolor = '#fef2f2';
                            border = '1px solid #fca5a5';
                        } else if (app.status === 'Chưa ký') {
                            color = '#4b5563';
                            bgcolor = '#f3f4f6';
                            border = '1px solid #d1d5db';
                        }
                        return (
                            <TableRow key={appIdx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell sx={{ fontWeight: 700, py: 0.75, fontSize: '0.75rem', color: 'text.secondary' }}>{app.appendix_number || '---'}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>{app.name}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.72rem', fontStyle: app.content ? 'normal' : 'italic', color: app.content ? 'text.primary' : 'text.secondary' }}>
                                    {app.content || '---'}
                                </TableCell>
                                <TableCell sx={{ py: 0.75 }}>
                                    <Box 
                                        onClick={(e) => handleAppStatusClick(e, appIdx)}
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
                                         {app.files?.map((file, fileIdx) => (
                                             <Button
                                                 key={fileIdx}
                                                 variant="text"
                                                 size="small"
                                                 href={getFileUrl(file)}
                                                 target="_blank"
                                                 sx={{ 
                                                     textTransform: 'none', 
                                                     fontSize: '0.7rem', 
                                                     py: 0.25, 
                                                     px: 0.75, 
                                                     borderRadius: '4px',
                                                     color: '#b45309',
                                                     bgcolor: '#fffbeb',
                                                     '&:hover': { bgcolor: '#fef3c7' }
                                                 }}
                                             >
                                                 {file.name}
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
                anchorEl={appAnchorEl}
                open={isAppMenuOpen}
                onClose={handleAppStatusClose}
                sx={{
                    '& .MuiPaper-root': {
                        borderRadius: '8px',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                        mt: 0.5
                    }
                }}
            >
                <MenuItem onClick={(e) => handleUpdateAppStatus('Chưa ký', e)} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', '&:hover': { bgcolor: '#f3f4f6' } }}>Chưa ký</MenuItem>
                <MenuItem onClick={(e) => handleUpdateAppStatus('Đã ký', e)} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', '&:hover': { bgcolor: '#f0fdf4' } }}>Đã ký</MenuItem>
                <MenuItem onClick={(e) => handleUpdateAppStatus('Hết hiệu lực', e)} sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', '&:hover': { bgcolor: '#fef2f2' } }}>Hết hiệu lực</MenuItem>
            </Menu>
        </Box>
    );
};

export default StageAppendicesTable;
