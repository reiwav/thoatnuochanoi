import { useState, useEffect } from 'react';
import useAuthStore from 'store/useAuthStore';
import sluiceGateApi from 'api/sluiceGate';
import { toast } from 'react-hot-toast';

const useSluiceGateDialog = ({ open, item, handleClose, refresh }) => {
    const { isCompany, user } = useAuthStore();
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        active: true,
        org_id: '',
        shared_org_ids: [],
        share_all: false,
        priority: 0,
        quantity: 0
    });

    useEffect(() => {
        if (open) {
            if (item) {
                setFormData({
                    ...item,
                    shared_org_ids: item.shared_org_ids || [],
                    share_all: item.share_all || false,
                    quantity: item.quantity || 0
                });
            } else {
                setFormData({
                    name: '',
                    address: '',
                    active: true,
                    org_id: isCompany ? '' : (user?.org_id || ''),
                    shared_org_ids: [],
                    share_all: false,
                    priority: 0,
                    quantity: 0
                });
            }
        }
    }, [item, open, isCompany, user]);

    const handleChange = (field, value) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'share_all' && value) next.shared_org_ids = [];
            return next;
        });
    };

    const handleSubmit = async () => {
        if (!formData.name) return toast.error('Vui lòng nhập tên cửa phai');
        if (!formData.org_id) return toast.error('Vui lòng chọn đơn vị quản lý');
        try {
            const payload = { 
                ...formData, 
                priority: parseInt(formData.priority) || 0,
                quantity: parseInt(formData.quantity) || 0
            };
            if (item) {
                await sluiceGateApi.update(item.id, payload);
                toast.success('Cập nhật thành công');
            } else {
                await sluiceGateApi.create(payload);
                toast.success('Thêm mới thành công');
            }
            refresh();
            handleClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Thao tác thất bại');
        }
    };

    return {
        formData,
        isCompany,
        user,
        handleChange,
        handleSubmit
    };
};

export default useSluiceGateDialog;
