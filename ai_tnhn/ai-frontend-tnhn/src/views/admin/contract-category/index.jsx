import { useState, useEffect } from 'react';
import {
    Button, Grid, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, CircularProgress, Typography, Chip, Tooltip,
    Box, useTheme, useMediaQuery
} from '@mui/material';
import { IconTrash, IconPlus, IconEdit, IconRefresh, IconCategory } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import contractCategoryApi from 'api/contractCategory';
import ContractCategoryDialog from './ContractCategoryDialog';

const CategoryRow = ({ row, handleOpenEdit, handleDelete, isMobile }) => {
    return (
        <TableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
            <TableCell sx={{ 
                pl: row.level * 4 + 2, 
                fontWeight: row.level === 0 ? 700 : 500,
                position: 'relative',
                '&:before': row.level > 0 ? {
                    content: '""',
                    position: 'absolute',
                    left: (row.level - 1) * 32 + 20,
                    top: '50%',
                    width: 15,
                    height: 1,
                    bgcolor: 'grey.300'
                } : {}
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconCategory size={18} style={{ marginRight: 8, color: row.level === 0 ? '#1e88e5' : '#757575' }} />
                    <Typography variant={row.level === 0 ? 'subtitle1' : 'body2'}>
                        {row.name}
                    </Typography>
                </Box>
            </TableCell>
            {!isMobile && <TableCell>{row.code}</TableCell>}
            {!isMobile && (
                <TableCell>
                    <Chip 
                        label={row.status ? 'Hoạt động' : 'Tạm dừng'} 
                        color={row.status ? 'success' : 'default'} 
                        size="small" 
                        variant="outlined" 
                    />
                </TableCell>
            )}
            {!isMobile && <TableCell align="center">{row.order}</TableCell>}
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                <Tooltip title="Chỉnh sửa">
                    <IconButton color="primary" size="small" onClick={() => handleOpenEdit(row)}>
                        <IconEdit size={20} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Xóa">
                    <IconButton color="error" size="small" onClick={() => handleDelete(row.id)}>
                        <IconTrash size={20} />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
    );
};

const ContractCategoryList = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const res = await contractCategoryApi.getTree();
            if (res.data?.status === 'success') {
                setCategories(res.data.data || []);
            }
        } catch (err) {
            console.error('Lỗi tải danh mục:', err);
            toast.error('Không thể tải danh sách danh mục');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleOpenCreate = () => {
        setEditingCategory(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (category) => {
        setEditingCategory(category);
        setDialogOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này? Các danh mục con có thể bị ảnh hưởng.')) return;
        try {
            const res = await contractCategoryApi.delete(id);
            if (res.data?.status === 'success') {
                toast.success('Xóa thành công');
                loadCategories();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa danh mục');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const res = editingCategory
                ? await contractCategoryApi.update(editingCategory.id, values)
                : await contractCategoryApi.create(values);
            if (res.data?.status === 'success') {
                toast.success(editingCategory ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadCategories();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    return (
        <MainCard
            title="Quản lý danh mục hợp đồng"
            secondary={
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <AnimateButton>
                        <IconButton color="primary" onClick={loadCategories} disabled={loading}>
                            <IconRefresh size={20} />
                        </IconButton>
                    </AnimateButton>
                    <AnimateButton>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<IconPlus size={18} />}
                            onClick={handleOpenCreate}
                        >
                            Thêm danh mục
                        </Button>
                    </AnimateButton>
                </Box>
            }
        >
            <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Tên danh mục</TableCell>
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Mã</TableCell>}
                            {!isMobile && <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>}
                            {!isMobile && <TableCell align="center" sx={{ fontWeight: 700 }}>Thứ tự</TableCell>}
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && categories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isMobile ? 2 : 5} align="center" sx={{ py: 3 }}>
                                    <CircularProgress size={24} color="secondary" />
                                </TableCell>
                            </TableRow>
                        ) : categories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isMobile ? 2 : 5} align="center" sx={{ py: 3 }}>
                                    Chưa có danh mục nào. Hãy thêm mới!
                                </TableCell>
                            </TableRow>
                        ) : (
                            categories.map((row) => (
                                <CategoryRow
                                    key={row.id}
                                    row={row}
                                    handleOpenEdit={handleOpenEdit}
                                    handleDelete={handleDelete}
                                    isMobile={isMobile}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <ContractCategoryDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSubmit={handleSubmit}
                category={editingCategory}
                isEdit={!!editingCategory}
            />
        </MainCard>
    );
};

export default ContractCategoryList;
