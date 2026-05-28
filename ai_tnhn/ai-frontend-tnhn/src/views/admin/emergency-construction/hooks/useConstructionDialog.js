import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const useConstructionDialog = ({ open, onClose, onSubmit, item, isEdit, defaultOrgId }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: '',
        start_date: 0,
        end_date: 0,
        status: 'planned',
        cost: 0,
        org_id: '',
        shared_org_ids: []
    });

    useEffect(() => {
        if (open) {
            if (isEdit && item) {
                setFormData({
                    name: item.name || '',
                    description: item.description || '',
                    location: item.location || '',
                    start_date: item.start_date || 0,
                    end_date: item.end_date || 0,
                    status: item.status || 'planned',
                    cost: item.cost || 0,
                    org_id: item.org_id || '',
                    shared_org_ids: item.shared_org_ids || []
                });
            } else {
                setFormData({
                    name: '',
                    description: '',
                    location: '',
                    start_date: Math.floor(Date.now() / 1000),
                    end_date: Math.floor(Date.now() / 1000) + 86400 * 30, // Default 30 days
                    status: 'planned',
                    cost: 0,
                    org_id: defaultOrgId || '',
                    shared_org_ids: []
                });
            }
        }
    }, [open, isEdit, item, defaultOrgId]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        if (!formData.name) {
            toast.error("Vui lòng nhập tên công trình");
            return;
        }
        if (!formData.org_id) {
            toast.error("Vui lòng chọn đơn vị quản lý");
            return;
        }

        onSubmit(formData);
    };

    const toDateString = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp * 1000).toISOString().split('T')[0];
    };

    const fromDateString = (dateStr) => {
        if (!dateStr) return 0;
        return Math.floor(new Date(dateStr).getTime() / 1000);
    };

    return {
        formData,
        handleChange,
        handleSave,
        toDateString,
        fromDateString
    };
};

export default useConstructionDialog;
