import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import contractCategoryApi from 'api/contractCategory';
import useAuthStore from 'store/useAuthStore';

export const useContractCategoryList = () => {
    const { hasPermission } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await contractCategoryApi.getTree();
            if (data) {
                setCategories(Array.isArray(data) ? data : []);
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
            await contractCategoryApi.delete(id);
            toast.success('Xóa thành công');
            loadCategories();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Lỗi xóa danh mục');
        }
    };

    const handleSubmit = async (values) => {
        try {
            const res = editingCategory
                ? await contractCategoryApi.update(editingCategory.id, values)
                : await contractCategoryApi.create(values);
            
            if (res) {
                toast.success(editingCategory ? 'Cập nhật thành công' : 'Thêm mới thành công');
                setDialogOpen(false);
                loadCategories();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        }
    };

    return {
        loading,
        categories,
        dialogOpen,
        setDialogOpen,
        editingCategory,
        hasPermission,
        loadCategories,
        handleOpenCreate,
        handleOpenEdit,
        handleDelete,
        handleSubmit
    };
};
