import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';

const useRainDialog = ({ open, isEdit, station, onClose, onSubmit }) => {
    const { user, isCompany, isSuperAdmin } = useAuthStore();
    const [formData, setFormData] = useState({
        OldId: 0,
        TenTram: '',
        TenPhuong: '',
        DiaChi: '',
        Lat: '',
        Lng: '',
        Active: true,
        org_id: '',
        shared_org_ids: [],
        share_all: false,
        Loai: '',
        NguongCanhBao: '',
        ThuTu: 0,
        TrongSoBaoCao: 0
    });

    useEffect(() => {
        if (open) {
            if (isEdit && station) {
                setFormData({
                    OldId: station.OldId !== undefined ? station.OldId : (station.Id !== undefined ? station.Id : 0),
                    TenTram: station.TenTram || '',
                    TenPhuong: station.TenPhuong || '',
                    DiaChi: station.DiaChi || '',
                    Lat: station.Lat || '',
                    Lng: station.Lng || '',
                    Active: station.Active !== undefined ? station.Active : true,
                    org_id: station.org_id || '',
                    shared_org_ids: station.shared_org_ids || [],
                    share_all: station.share_all || false,
                    Loai: station.Loai || '',
                    NguongCanhBao: station.NguongCanhBao !== undefined ? station.NguongCanhBao : '',
                    ThuTu: station.ThuTu !== undefined ? station.ThuTu : 0,
                    TrongSoBaoCao: station.TrongSoBaoCao !== undefined ? station.TrongSoBaoCao : 0
                });
            } else {
                setFormData({
                    OldId: 0,
                    TenTram: '',
                    TenPhuong: '',
                    DiaChi: '',
                    Lat: '',
                    Lng: '',
                    Active: true,
                    org_id: isCompany ? '' : (user?.org_id || ''),
                    shared_org_ids: [],
                    share_all: false,
                    Loai: '',
                    NguongCanhBao: '',
                    ThuTu: 0,
                    TrongSoBaoCao: 0
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
            toast.error('Vui lòng nhập tên trạm');
            return;
        }
        const submitData = {
            ...formData,
            OldId: parseInt(formData.OldId) || 0,
            NguongCanhBao: formData.NguongCanhBao !== '' ? parseFloat(formData.NguongCanhBao) : 0,
            ThuTu: parseInt(formData.ThuTu) || 0,
            TrongSoBaoCao: parseInt(formData.TrongSoBaoCao) || 0
        };
        onSubmit(submitData);
    };

    return {
        formData,
        isSuperAdmin,
        handleChange,
        handleSave
    };
};

export default useRainDialog;
