import React, { useState, useEffect } from 'react';
import { Stack } from '@mui/material';
import { toast } from 'react-hot-toast';
import useAuthStore from 'store/useAuthStore';
import StationDialogWrapper from '../shared/StationDialogWrapper';
import StationBaseFields from '../shared/StationBaseFields';

const InundationDialog = ({ open, onClose, onSubmit, station, isEdit, organizations }) => {
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
        if (!formData.TenTram) return toast.error('Vui lòng nhập tên điểm ngập');
        onSubmit(formData);
    };

    return (
        <StationDialogWrapper
            open={open}
            onClose={onClose}
            onSave={handleSave}
            title={`${isEdit ? 'Chỉnh sửa' : 'Thêm mới'} điểm ngập úng`}
            isEdit={isEdit}
        >
            <StationBaseFields
                formData={formData}
                handleChange={handleChange}
                organizations={organizations}
            />
        </StationDialogWrapper>
    );
};

export default InundationDialog;
