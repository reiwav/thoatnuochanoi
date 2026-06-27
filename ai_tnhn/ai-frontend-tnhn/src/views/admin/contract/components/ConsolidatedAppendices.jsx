import React from 'react';
import { Box, Typography, Table, TableHead, TableBody, TableRow, TableCell, Stack, Button } from '@mui/material';
import { IconFileText } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { getFileUrl } from '../utils';

const ConsolidatedAppendices = ({ 
    allAppendices, 
    groupedAppendices, 
    formatPrice, 
    getTotalPrice 
}) => {
    return (
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, color: '#e65100' }}>
                    <IconFileText size={18} /> Tổng hợp danh sách phụ lục hợp đồng ({allAppendices.length})
                </Typography>
            </Box>
            {allAppendices.length > 0 ? (
                <Stack spacing={2}>
                    {Object.keys(groupedAppendices).sort((a, b) => b.localeCompare(a)).map((year) => (
                        <Box key={year} sx={{ pl: 1 }}>
                            <Typography variant="subtitle2" color="warning.dark" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                📅 Năm {year} ({groupedAppendices[year].length})
                            </Typography>
                            <Table size="small" sx={{ bgcolor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid', borderColor: 'divider', mb: 1 }}>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Số phụ lục</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Tên phụ lục / Nội dung</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Thời hạn</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Giá trị</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {groupedAppendices[year].map((app, idx) => (
                                        <TableRow key={idx} hover>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                                {app.appendix_number || app.contract_number || '---'}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{app.name}</Typography>
                                                {app.content && (
                                                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                                        Nội dung: {app.content}
                                                    </Typography>
                                                )}
                                                {app.files && app.files.length > 0 && (
                                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                                                        {app.files.map((file, fileIdx) => (
                                                            <Button
                                                                key={fileIdx}
                                                                variant="text"
                                                                size="small"
                                                                startIcon={<IconFileText size={12} />}
                                                                href={getFileUrl(file)}
                                                                target="_blank"
                                                                sx={{ 
                                                                    textTransform: 'none', 
                                                                    fontSize: '0.75rem',
                                                                    py: 0,
                                                                    px: 0.5,
                                                                    minWidth: 0,
                                                                    color: 'primary.main',
                                                                    '&:hover': { textDecoration: 'underline' }
                                                                }}
                                                            >
                                                                {file.name}
                                                            </Button>
                                                        ))}
                                                    </Stack>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">
                                                    {app.start_date ? dayjs(app.start_date).format('DD/MM/YYYY') : '...'} - {app.end_date ? dayjs(app.end_date).format('DD/MM/YYYY') : '...'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                                                {app.stages ? formatPrice(getTotalPrice(app.stages)) : '---'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    ))}
                </Stack>
            ) : (
                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>Chưa có phụ lục hợp đồng.</Typography>
            )}
        </Box>
    );
};

export default ConsolidatedAppendices;
