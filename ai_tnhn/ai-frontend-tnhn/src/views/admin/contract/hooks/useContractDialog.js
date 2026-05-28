import { useState, useEffect } from 'react';
import contractApi from 'api/contract';
import contractCategoryApi from 'api/contractCategory';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';

export const useContractDialog = ({ open, onClose, onSubmit, contract, isEdit, parentContract }) => {
    const [values, setValues] = useState({
        name: '',
        contract_number: '',
        investor_name: '',
        jv_members: '',
        parent_id: '',
        category_id: '',
        start_date: null,
        end_date: null,
        stages: [{ name: '', amount: 0, date: null }],
        note: '',
        drive_folder_id: '',
        drive_folder_link: '',
        files: []
    });
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState([]);

    const loadCategories = async () => {
        try {
            const res = await contractCategoryApi.getTree();
            console.log("loadCategories res:", res);
            if (Array.isArray(res)) {
                setCategories(res);
            } else if (res && res.data) {
                setCategories(res.data || []);
            }
        } catch (err) {
            console.error('Failed to load categories', err);
        }
    };

    const refreshFiles = async () => {
        if (!isEdit || !contract?.id) return;
        try {
            const res = await contractApi.getById(contract.id);
            if (res && res.id) {
                const refreshedFiles = res.files || [];
                setValues(prev => ({
                    ...prev,
                    files: refreshedFiles
                }));
            }
        } catch (err) {
            console.error('Failed to refresh files', err);
        }
    };

    useEffect(() => {
        if (open) {
            loadCategories();
            if (isEdit && contract) {
                setValues({
                    name: contract.name || '',
                    contract_number: contract.contract_number || '',
                    investor_name: contract.investor_name || '',
                    jv_members: contract.jv_members || '',
                    parent_id: contract.parent_id || '',
                    category_id: contract.category_id || '',
                    start_date: contract.start_date ? dayjs(contract.start_date) : null,
                    end_date: contract.end_date ? dayjs(contract.end_date) : null,
                    stages: contract.stages ? contract.stages.map(s => ({
                        ...s,
                        date: s.date ? dayjs(s.date) : null
                    })) : [{ name: '', amount: 0, date: null }],
                    note: contract.note || '',
                    drive_folder_id: contract.drive_folder_id || '',
                    drive_folder_link: contract.drive_folder_link || '',
                    files: contract.files || []
                });
            } else if (parentContract) {
                setValues({
                    name: '',
                    contract_number: '',
                    investor_name: parentContract.investor_name || '',
                    jv_members: parentContract.jv_members || '',
                    parent_id: parentContract.id || '',
                    category_id: parentContract.category_id || '',
                    start_date: null,
                    end_date: null,
                    stages: [{ name: '', amount: 0, date: null }],
                    note: '',
                    drive_folder_id: '',
                    drive_folder_link: '',
                    files: []
                });
            } else {
                setValues({
                    name: '',
                    contract_number: '',
                    investor_name: '',
                    jv_members: '',
                    parent_id: '',
                    category_id: '',
                    start_date: null,
                    end_date: null,
                    stages: [{ name: '', amount: 0, date: null }],
                    note: '',
                    drive_folder_id: '',
                    drive_folder_link: '',
                    files: []
                });
            }
        }
    }, [open, isEdit, contract, parentContract]);

    // Automatically poll and refresh files list if there are any local files waiting to be synced to Drive
    useEffect(() => {
        let intervalId = null;
        
        const hasLocalFiles = values.files && values.files.some(file => 
            (file.id && file.id.startsWith('local:')) || 
            (file.link && (file.link.startsWith('/') || file.link.startsWith('local:')))
        );
        
        if (open && isEdit && contract?.id && hasLocalFiles) {
            intervalId = setInterval(() => {
                refreshFiles();
            }, 3000);
        }
        
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [open, isEdit, contract?.id, values.files]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues(prev => ({ ...prev, [name]: value }));
    };

    const handleStageChange = (index, field, value) => {
        const newStages = [...values.stages];
        newStages[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
        setValues(prev => ({ ...prev, stages: newStages }));
    };

    const addStage = () => {
        setValues(prev => ({
            ...prev,
            stages: [...prev.stages, { name: '', amount: 0, date: null }]
        }));
    };

    const removeStage = (index) => {
        const newStages = values.stages.filter((_, i) => i !== index);
        setValues(prev => ({ ...prev, stages: newStages }));
    };

    const handleSave = async () => {
        if (!values.name) return;

        // Validate stage constraints
        if (values.start_date && values.end_date) {
            for (let i = 0; i < values.stages.length; i++) {
                const stage = values.stages[i];
                if (stage.date) {
                    const stDate = dayjs(stage.date);
                    if (stDate.isBefore(values.start_date, 'day') || stDate.isAfter(values.end_date, 'day')) {
                        toast.error(`Ngày của giai đoạn "${stage.name || `Giai đoạn ${i + 1}`}" phải nằm trong thời gian hợp đồng (${values.start_date.format('DD/MM/YYYY')} - ${values.end_date.format('DD/MM/YYYY')}).`);
                        return; // Stop explicitly on error
                    }
                }
            }
        }

        const data = {
            ...values,
            stages: values.stages.map(s => ({
                ...s,
                date: s.date ? dayjs(s.date).toISOString() : null
            })),
            start_date: values.start_date ? values.start_date.toISOString() : null,
            end_date: values.end_date ? values.end_date.toISOString() : null,
        };
        
        setSubmitting(true);
        try {
            await onSubmit(data);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return {
        values,
        setValues,
        uploading,
        setUploading,
        submitting,
        categories,
        handleChange,
        handleStageChange,
        addStage,
        removeStage,
        handleSave
    };
};
