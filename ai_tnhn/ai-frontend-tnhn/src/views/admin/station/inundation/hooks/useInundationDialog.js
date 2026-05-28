import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';

const useInundationDialog = ({ open, isEdit, station, onClose, onSubmit }) => {
    const { user, isCompany } = useAuthStore();
    const [formData, setFormData] = useState({
        TenTram: '',
        DiaChi: '',
        Lat: '',
        Lng: '',
        Active: true,
        org_id: '',
        shared_org_ids: [],
        share_all: false
    });

    useEffect(() => {
        if (open) {
            if (isEdit && station) {
                setFormData({
                    TenTram: station.TenTram || station.name || '',
                    DiaChi: station.DiaChi || station.address || '',
                    Lat: station.Lat || station.lat || '',
                    Lng: station.Lng || station.lng || '',
                    Active: station.Active !== undefined ? station.Active : (station.active !== undefined ? station.active : true),
                    org_id: station.org_id || '',
                    shared_org_ids: station.shared_org_ids || [],
                    share_all: station.share_all || false
                });
            } else {
                setFormData({
                    TenTram: '',
                    DiaChi: '',
                    Lat: '',
                    Lng: '',
                    Active: true,
                    org_id: isCompany ? '' : (user?.org_id || ''),
                    shared_org_ids: [],
                    share_all: false
                });
            }
        }
    }, [open, isEdit, station, user, isCompany]);

    const handleChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            if (field === 'share_all' && value === true) {
                newData.shared_org_ids = [];
            }
            return newData;
        });
    };

    const handleSave = () => {
        if (!formData.TenTram) {
            toast.error('Vui lòng nhập tên điểm ngập');
            return;
        }
        onSubmit(formData);
    };

    return {
        formData,
        handleChange,
        handleSave
    };
};

export default useInundationDialog;
