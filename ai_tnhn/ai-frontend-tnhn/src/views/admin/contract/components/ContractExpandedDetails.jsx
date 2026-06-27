import React from 'react';
import { Box, Typography, Stack, Button, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';
import { IconCash, IconFileText } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { getFileUrl } from '../utils';
import StageRow from './StageRow';
import ConsolidatedAppendices from './ConsolidatedAppendices';

const ContractExpandedDetails = ({ 
    row, 
    appendices, 
    formatPrice, 
    getTotalPrice 
}) => {
    // Collect all appendices nested inside stages
    const stageAppendices = row.stages?.reduce((acc, stage) => {
        if (stage.appendices && stage.appendices.length > 0) {
            return [...acc, ...stage.appendices];
        }
        return acc;
    }, []) || [];

    // Combine legacy standalone appendices and stage-level appendices
    const allAppendices = [
        ...stageAppendices,
        ...(appendices || [])
    ];

    // Group appendices by year
    const groupedAppendices = allAppendices.reduce((acc, app) => {
        const yearKey = app.year || (app.start_date ? dayjs(app.start_date).year() : null) || 'Khác';
        if (!acc[yearKey]) {
            acc[yearKey] = [];
        }
        acc[yearKey].push(app);
        return acc;
    }, {});

    return (
        <Box sx={{ py: 2, px: 4, bgcolor: 'grey.50', borderRadius: '8px', mb: 2, mx: 2 }}>
            {/* Investor and JV Members Row */}
            {(row.investor_name || row.jv_members || (row.joint_venture_members && row.joint_venture_members.length > 0)) && (
                <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    {row.investor_name && (
                        <Box sx={{ bgcolor: 'white', px: 1.5, py: 0.5, borderRadius: '6px', border: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.5px' }}>Chủ đầu tư:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8rem' }}>{row.investor_name}</Typography>
                        </Box>
                    )}
                    {(row.jv_members || (row.joint_venture_members && row.joint_venture_members.length > 0)) && (
                        <Box sx={{ bgcolor: 'white', px: 1.5, py: 0.5, borderRadius: '6px', border: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.5px' }}>Thành viên liên danh:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8rem' }}>
                                {row.joint_venture_members && row.joint_venture_members.length > 0 
                                    ? row.joint_venture_members.join(', ') 
                                    : row.jv_members}
                            </Typography>
                        </Box>
                    )}
                </Stack>
            )}

            {/* Contract Content */}
            {row.content && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'white', borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>NỘI DUNG CHÍNH HỢP ĐỒNG</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, mt: 0.5, whiteSpace: 'pre-wrap' }}>{row.content}</Typography>
                </Box>
            )}

            {/* Stages Section with nested records */}
            <Typography variant="h5" gutterBottom component="div" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconCash size={18} /> Chi tiết các giai đoạn thanh toán
            </Typography>
            {row.stages && row.stages.length > 0 ? (
                <Table size="small" aria-label="stages" sx={{ mb: 3, bgcolor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Tên giai đoạn</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Ngày dự kiến</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Số tiền</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {row.stages.map((stage, idx) => (
                            <StageRow 
                                key={idx}
                                stage={stage}
                                idx={idx}
                                contract={row}
                                formatPrice={formatPrice}
                            />
                        ))}
                        <TableRow>
                            <TableCell colSpan={2} sx={{ fontWeight: 700, pt: 2, textAlign: 'right' }}>Tổng cộng:</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, pt: 2, color: 'success.main', fontSize: '1rem' }}>
                                {formatPrice(getTotalPrice(row.stages))}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            ) : (
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>Không có thông tin giai đoạn.</Typography>
            )}

            {row.note && (
                <Box sx={{ mt: 2, p: 1.5, borderLeft: '4px solid', borderColor: 'secondary.main', bgcolor: 'white', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Ghi chú:</Typography>
                    <Typography variant="body2">{row.note}</Typography>
                </Box>
            )}
            
            {row.files && row.files.length > 0 && (
                <Box sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconFileText size={18} /> Tài liệu đính kèm hợp đồng chính:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {row.files.map((file, idx) => (
                            <Button
                                key={idx}
                                variant="outlined"
                                size="small"
                                startIcon={<IconFileText size={14} />}
                                href={getFileUrl(file)}
                                target="_blank"
                                sx={{ 
                                    textTransform: 'none', 
                                    borderRadius: '6px',
                                    borderColor: 'divider',
                                    bgcolor: 'white',
                                    '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.lightest' }
                                }}
                            >
                                {file.name}
                            </Button>
                        ))}
                    </Box>
                </Box>
            )}

            {/* Appendices Section (Grouped by Year for all stages) */}
            <ConsolidatedAppendices 
                allAppendices={allAppendices}
                groupedAppendices={groupedAppendices}
                formatPrice={formatPrice}
                getTotalPrice={getTotalPrice}
            />
        </Box>
    );
};

export default ContractExpandedDetails;
