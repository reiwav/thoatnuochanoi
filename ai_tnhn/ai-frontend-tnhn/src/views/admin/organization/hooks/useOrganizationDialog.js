import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const initialFormData = {
    name: '',
    code: '',
    description: '',
    status: true,
    address: '',
    phone_number: '',
    email: '',
    representative: '',
    order: ''
};

const useOrganizationDialog = ({ open, organization, isEdit, onSubmit, onClose }) => {
    const [formData, setFormData] = useState({ ...initialFormData });

    useEffect(() => {
        if (open) {
            if (isEdit && organization) {
                setFormData({
                    name: organization.name || '',
                    code: organization.code || '',
                    description: organization.description || '',
                    status: organization.status !== undefined ? organization.status : true,
                    address: organization.address || '',
                    phone_number: organization.phone_number || '',
                    email: organization.email || '',
                    representative: organization.representative || '',
                    order: organization.order || ''
                });
            } else {
                setFormData({ ...initialFormData });
            }
        }
    }, [open, isEdit, organization]);

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        if (!formData.name) return toast.error("Vui lòng nhập Tên đơn vị");
        if (!formData.code) return toast.error("Vui lòng nhập mã đơn vị");
        if (!formData.phone_number) return toast.error("Vui lòng nhập số điện thoại");
        if (!formData.email) return toast.error("Vui lòng nhập email");

        onSubmit(formData);
    };

    return {
        formData,
        handleChange,
        handleSave
    };
};

export default useOrganizationDialog;
