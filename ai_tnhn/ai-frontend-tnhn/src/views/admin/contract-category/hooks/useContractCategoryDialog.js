import { useState, useEffect } from 'react';
import contractCategoryApi from 'api/contractCategory';

export const useContractCategoryDialog = ({ open, category, isEdit }) => {
    const [values, setValues] = useState({
        name: '',
        code: '',
        description: '',
        parent_id: '',
        status: true,
        order: 0
    });
    const [parents, setParents] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadParents = async () => {
        setLoading(true);
        try {
            const res = await contractCategoryApi.getTree();
            if (res.data?.status === 'success') {
                // Filter out current category and its descendants if editing to prevent cycles
                let list = res.data.data || [];
                if (isEdit && category) {
                    list = list.filter(c => c.id !== category.id && !c.path.includes(`,${category.id},`));
                }
                setParents(list);
            }
        } catch (err) {
            console.error('Failed to load categories:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            if (isEdit && category) {
                setValues({
                    name: category.name || '',
                    code: category.code || '',
                    description: category.description || '',
                    parent_id: category.parent_id || '',
                    status: category.status !== false,
                    order: category.order || 0
                });
            } else {
                setValues({
                    name: '',
                    code: '',
                    description: '',
                    parent_id: '',
                    status: true,
                    order: 0
                });
            }
            loadParents();
        }
    }, [open, isEdit, category]);

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        setValues(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return {
        values,
        setValues,
        parents,
        loading,
        handleChange,
        loadParents
    };
};
