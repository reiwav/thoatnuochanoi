import { useState, useEffect } from 'react';
import pumpingStationApi from 'api/pumpingStation';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';

export const usePumpingStationDialog = ({ open, handleClose, item, refresh }) => {
    const { isCompany, user } = useAuthStore();
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        pump_count: 0,
        active: true,
        link: '',
        is_auto: false,
        org_id: '',
        shared_org_ids: [],
        share_all: false,
        priority: 0
    });

    useEffect(() => {
        if (open) {
            if (item) {
                setFormData({
                    ...item,
                    shared_org_ids: item.shared_org_ids || [],
                    share_all: item.share_all || false
                });
            } else {
                setFormData({
                    name: '',
                    address: '',
                    pump_count: 0,
                    active: true,
                    link: '',
                    is_auto: false,
                    org_id: isCompany ? '' : (user?.org_id || ''),
                    shared_org_ids: [],
                    share_all: false,
                    priority: 0
                });
            }
        }
    }, [item, open, isCompany, user]);

    const handleChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            if (field === 'share_all' && value === true) {
                newData.shared_org_ids = [];
            }
            return newData;
        });
    };

    const handleSubmit = async () => {
        if (!formData.name) return toast.error("Vui lòng nhập tên trạm bơm");
        if (!formData.org_id) return toast.error("Vui lòng chọn đơn vị quản lý");

        try {
            const payload = {
                ...formData,
                pump_count: parseInt(formData.pump_count),
                priority: parseInt(formData.priority) || 0,
            };
            if (item) {
                await pumpingStationApi.update(item.id, payload);
                toast.success('Cập nhật thành công');
            } else {
                await pumpingStationApi.create(payload);
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
        handleChange,
        handleSubmit
    };
};
