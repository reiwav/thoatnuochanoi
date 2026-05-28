import { useEffect, useState } from 'react';

const initialValues = {
    name: '',
    code: '',
    description: '',
    level: 0,
    group: '',
    is_company: false,
    is_employee: false
};

const useRoleDialog = ({ open, role, onSubmit }) => {
    const [values, setValues] = useState({ ...initialValues });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (role) {
            setValues({
                name: role.name || '',
                code: role.code || '',
                description: role.description || '',
                level: role.level || 0,
                group: role.group || '',
                is_company: role.is_company || false,
                is_employee: role.is_employee || false
            });
        } else {
            setValues({ ...initialValues });
        }
        setErrors({});
    }, [role, open]);

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        let finalValue = type === 'checkbox' ? checked : value;
        if (name === 'level') finalValue = parseInt(value, 10) || 0;
        setValues(prev => ({ ...prev, [name]: finalValue }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!values.name) newErrors.name = 'Vui lòng nhập tên vai trò';
        if (!values.code) newErrors.code = 'Vui lòng nhập mã vai trò';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFormSubmit = () => {
        if (validate()) {
            onSubmit(values);
        }
    };

    return {
        values,
        errors,
        handleChange,
        handleFormSubmit
    };
};

export default useRoleDialog;
