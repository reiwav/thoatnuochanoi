import { useState } from 'react';
import {
    TableCell, TableRow, IconButton, Typography, Collapse,
    Box, Stack, Button, Table, TableHead, TableBody
} from '@mui/material';
import { 
    IconTrash, IconEdit, IconFileText, IconChevronDown, IconChevronUp, IconCash, IconPlus
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import PermissionGuard from 'ui-component/PermissionGuard';

const ContractRow = ({ row, appendices, handleOpenEdit, handleDelete, handleAddAppendix, isMobile, formatPrice, getTotalPrice, hasPermission }) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell width={60}>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                        color={open ? 'secondary' : 'default'}
                    >
                        {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconFileText size={18} style={{ marginRight: 8, color: '#1e88e5' }} />
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{row.name}</Typography>
                            {row.contract_number && (
                                <Typography variant="caption" color="textSecondary" sx={{ bgcolor: 'grey.100', px: 1, py: 0.25, borderRadius: '4px', display: 'inline-block', mt: 0.5 }}>
                                    Số HĐ: {row.contract_number}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </TableCell>
                {!isMobile && (
                    <TableCell>
                        <Typography variant="body2">
                            {row.start_date ? dayjs(row.start_date).format('DD/MM/YYYY') : '...'} - {row.end_date ? dayjs(row.end_date).format('DD/MM/YYYY') : '...'}
                        </Typography>
                    </TableCell>
                )}
                {!isMobile && (
                    <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>
                        {formatPrice(getTotalPrice(row.stages))}
                    </TableCell>
                )}
                <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <PermissionGuard permission="contract:edit">
                            <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                                <IconEdit size={20} />
                            </IconButton>
                        </PermissionGuard>
                        <PermissionGuard permission="contract:delete">
                            <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                                <IconTrash size={20} />
                            </IconButton>
                        </PermissionGuard>
                    </Stack>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 2, px: 4, bgcolor: 'grey.50', borderRadius: '8px', mb: 2, mx: 2 }}>
                            {/* Investor and JV Members Row */}
                            {(row.investor_name || row.jv_members) && (
                                <Box sx={{ mb: 3, p: 2, bgcolor: 'white', borderRadius: '12px', border: '1px solid', borderColor: 'divider', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {row.investor_name && (
                                        <Box>
                                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>CHỦ ĐẦU TƯ</Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>{row.investor_name}</Typography>
                                        </Box>
                                    )}
                                    {row.jv_members && (
                                        <Box>
                                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>THÀNH VIÊN LIÊN DANH</Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>{row.jv_members}</Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}

                            <Typography variant="h5" gutterBottom component="div" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconCash size={18} /> Chi tiết các giai đoạn thanh toán
                            </Typography>
                            {row.stages && row.stages.length > 0 ? (
                                <Table size="small" aria-label="stages">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Tên giai đoạn</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Ngày dự kiến</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>Số tiền</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {row.stages.map((stage, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell component="th" scope="row">
                                                    {stage.name || `Giai đoạn ${idx + 1}`}
                                                </TableCell>
                                                <TableCell>
                                                    {stage.date ? dayjs(stage.date).format('DD/MM/YYYY') : '---'}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                    {formatPrice(stage.amount)}
                                                </TableCell>
                                            </TableRow>
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
                                <Typography variant="body2" color="textSecondary">Không có thông tin giai đoạn.</Typography>
                            )}
                            {row.note && (
                                <Box sx={{ mt: 2, p: 1.5, borderLeft: '4px solid', borderColor: 'secondary.main', bgcolor: 'white' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Ghi chú:</Typography>
                                    <Typography variant="body2">{row.note}</Typography>
                                </Box>
                            )}
                            {row.files && row.files.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <IconFileText size={18} /> Tài liệu đính kèm:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {row.files.map((file, idx) => (
                                            <Button
                                                key={idx}
                                                variant="outlined"
                                                size="small"
                                                startIcon={<IconFileText size={14} />}
                                                href={file.link || `https://drive.google.com/open?id=${file.id}`}
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

                            {/* Appendices Section */}
                            {!row.parent_id && (
                                <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, color: '#e65100' }}>
                                            <IconFileText size={18} /> Danh sách phụ lục hợp đồng ({appendices ? appendices.length : 0})
                                        </Typography>
                                        <PermissionGuard permission="contract:create">
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                color="warning" 
                                                startIcon={<IconPlus size={14} />}
                                                onClick={() => handleAddAppendix(row)}
                                                sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 600 }}
                                            >
                                                Thêm phụ lục
                                            </Button>
                                        </PermissionGuard>
                                    </Box>
                                    {appendices && appendices.length > 0 ? (
                                        <Table size="small" sx={{ bgcolor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                            <TableBody>
                                                {appendices.map((app, idx) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell sx={{ pl: 2 }}>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{app.name}</Typography>
                                                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                                                                {app.contract_number && (
                                                                    <Typography variant="caption" color="textSecondary" sx={{ bgcolor: 'grey.100', px: 1, py: 0.1, borderRadius: '4px' }}>
                                                                        Số PL: {app.contract_number}
                                                                    </Typography>
                                                                )}
                                                                {app.files && app.files.length > 0 && app.files.map((file, fileIdx) => (
                                                                    <Button
                                                                        key={fileIdx}
                                                                        variant="text"
                                                                        size="small"
                                                                        startIcon={<IconFileText size={12} />}
                                                                        href={file.link || `https://drive.google.com/open?id=${file.id}`}
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
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="caption" color="textSecondary">
                                                                Thời hạn: {app.start_date ? dayjs(app.start_date).format('DD/MM/YYYY') : '...'} - {app.end_date ? dayjs(app.end_date).format('DD/MM/YYYY') : '...'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                                                            {formatPrice(getTotalPrice(app.stages))}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ pr: 2 }}>
                                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                                <PermissionGuard permission="contract:edit">
                                                                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(app)}>
                                                                        <IconEdit size={16} />
                                                                    </IconButton>
                                                                </PermissionGuard>
                                                                <PermissionGuard permission="contract:delete">
                                                                    <IconButton size="small" color="error" onClick={() => handleDelete(app.id)}>
                                                                        <IconTrash size={16} />
                                                                    </IconButton>
                                                                </PermissionGuard>
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>Chưa có phụ lục hợp đồng.</Typography>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

export default ContractRow;
