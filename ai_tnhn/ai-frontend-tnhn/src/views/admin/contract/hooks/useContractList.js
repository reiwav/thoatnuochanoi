import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';
import useContractStore from 'store/useContractStore';

export const useContractList = () => {
    const { hasPermission } = useAuthStore();
    
    const { 
        contracts, loading, filters, 
        fetchContracts, setFilters, 
        createContract, updateContract, deleteContract 
    } = useContractStore();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [parentContract, setParentContract] = useState(null);
    const [filterInput, setFilterInput] = useState(filters.name);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    // Automatically poll and refresh contracts list if any contract has local files currently syncing to Google Drive
    useEffect(() => {
        const hasLocalFiles = contracts.some(c => 
            c.files && c.files.some(file => 
                (file.id && file.id.startsWith('local:')) ||
                (file.link && (file.link.startsWith('/') || file.link.startsWith('local:')))
            )
        );
        
        let intervalId = null;
        if (hasLocalFiles && !loading) {
            intervalId = setInterval(() => {
                fetchContracts();
            }, 4000);
        }
        
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [contracts, loading, fetchContracts]);

    const handleSearch = () => {
        setFilters({ name: filterInput });
        fetchContracts();
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    const handleOpenCreate = () => {
        setParentContract(null);
        setEditingContract(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (contract) => {
        setParentContract(null);
        setEditingContract(contract);
        setDialogOpen(true);
    };

    const handleAddAppendix = (parent) => {
        setParentContract(parent);
        setEditingContract(null);
        setDialogOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa hợp đồng này?')) return;
        try {
            await deleteContract(id);
            toast.success('Xóa hợp đồng thành công');
        } catch (err) {
            toast.error('Lỗi khi xóa hợp đồng');
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingContract) {
                await updateContract(editingContract.id, values);
            } else {
                await createContract(values);
            }
            toast.success(editingContract ? 'Cập nhật thành công' : 'Thêm mới thành công');
            setDialogOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
            throw err;
        }
    };

    const formatPrice = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };

    const getTotalPrice = (stages) => {
        return stages?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
    };

    return {
        contracts,
        loading,
        dialogOpen,
        setDialogOpen,
        editingContract,
        setEditingContract,
        parentContract,
        setParentContract,
        filterInput,
        setFilterInput,
        hasPermission,
        handleSearch,
        handleKeyDown,
        handleOpenCreate,
        handleOpenEdit,
        handleAddAppendix,
        handleDelete,
        handleSubmit,
        formatPrice,
        getTotalPrice
    };
};
