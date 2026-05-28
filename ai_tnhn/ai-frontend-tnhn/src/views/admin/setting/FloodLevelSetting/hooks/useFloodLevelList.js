import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import settingApi from 'api/setting';

const useFloodLevelList = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [floodLevels, setFloodLevels] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState(-1);
    const [editingLevel, setEditingLevel] = useState(null);

    const fetchFloodLevels = async () => {
        setLoading(true);
        try {
            const response = await settingApi.getFloodLevels();
            setFloodLevels(response || []);
        } catch (err) {
            toast.error('Lỗi lấy dữ liệu cấu hình');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFloodLevels();
    }, []);

    const handleOpenCreate = () => {
        setEditingIndex(-1);
        setEditingLevel(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (level, index) => {
        setEditingIndex(index);
        setEditingLevel(level);
        setDialogOpen(true);
    };

    const saveToServer = async (newList) => {
        setSaving(true);
        try {
            await settingApi.updateFloodLevels(newList);
            toast.success('Lưu cấu hình thành công');
            setFloodLevels(newList);
        } catch (err) {
            toast.error(err.response?.data?.error || err.message || 'Lỗi lưu cấu hình');
            fetchFloodLevels();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (index) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa mức độ này?')) return;
        const newList = [...floodLevels];
        newList.splice(index, 1);
        await saveToServer(newList);
    };

    const handleDialogSubmit = async (values) => {
        const newList = [...floodLevels];
        if (editingIndex > -1) {
            newList[editingIndex] = values;
        } else {
            newList.push(values);
        }
        await saveToServer(newList);
        setDialogOpen(false);
    };

    return {
        loading,
        saving,
        floodLevels,
        dialogOpen,
        setDialogOpen,
        editingIndex,
        editingLevel,
        handleOpenCreate,
        handleOpenEdit,
        handleDelete,
        handleDialogSubmit
    };
};

export default useFloodLevelList;
