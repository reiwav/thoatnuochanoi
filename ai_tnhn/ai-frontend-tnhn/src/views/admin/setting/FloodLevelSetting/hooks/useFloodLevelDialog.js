import { useEffect, useState } from 'react';

const initialValues = {
    code: '',
    name: '',
    min_depth: 0,
    max_depth: 0,
    color: '#000000',
    description: '',
    is_flooding: false
};

const useFloodLevelDialog = ({ open, level, onSubmit }) => {
    const [values, setValues] = useState({ ...initialValues });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (level) {
            setValues({
                code: level.code || '',
                name: level.name || '',
                min_depth: level.min_depth || 0,
                max_depth: level.max_depth || 0,
                color: level.color || '#000000',
                description: level.description || '',
                is_flooding: level.is_flooding || false
            });
        } else {
            setValues({
                code: '',
                name: '',
                min_depth: 0,
                max_depth: 0,
                color: '#2196f3',
                description: '',
                is_flooding: false
            });
        }
        setErrors({});
    }, [level, open]);

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        let finalValue = type === 'checkbox' ? checked : value;
        if (name === 'min_depth' || name === 'max_depth') {
            finalValue = parseFloat(value) || 0;
        }
        setValues(prev => ({ ...prev, [name]: finalValue }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!values.code) newErrors.code = 'Vui lòng nhập mã mức độ';
        if (!values.name) newErrors.name = 'Vui lòng nhập tên mức độ';
        if (values.max_depth < values.min_depth) {
            newErrors.max_depth = 'Sâu tối đa không được nhỏ hơn tối thiểu';
        }
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

export default useFloodLevelDialog;
