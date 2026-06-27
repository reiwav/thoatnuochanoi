import { useState, useEffect } from 'react';
import contractApi from 'api/contract';
import contractCategoryApi from 'api/contractCategory';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';

export const useContractDialog = ({ open, onClose, onSubmit, contract, isEdit }) => {
    const [values, setValues] = useState({
        id: '',
        name: '',
        contract_number: '',
        investor_name: '',
        jv_members: '',
        category_id: '',
        start_date: null,
        end_date: null,
        stages: [{ name: '', amount: 0, date: null, acceptance_records: [], payment_records: [], appendices: [] }],
        note: '',
        drive_folder_id: '',
        drive_folder_link: '',
        files: [],
        content: '',
        joint_venture_members: []
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
                setValues(prev => ({
                    ...prev,
                    files: res.files || [],
                    stages: res.stages ? res.stages.map(s => ({
                        ...s,
                        date: s.date ? dayjs(s.date) : null,
                        acceptance_records: s.acceptance_records || [],
                        payment_records: s.payment_records || [],
                        appendices: s.appendices || []
                    })) : prev.stages
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
                    id: contract.id || '',
                    name: contract.name || '',
                    contract_number: contract.contract_number || '',
                    investor_name: contract.investor_name || '',
                    jv_members: contract.jv_members || '',
                    category_id: contract.category_id || '',
                    start_date: contract.start_date ? dayjs(contract.start_date) : null,
                    end_date: contract.end_date ? dayjs(contract.end_date) : null,
                    stages: contract.stages ? contract.stages.map(s => ({
                        ...s,
                        date: s.date ? dayjs(s.date) : null,
                        acceptance_records: s.acceptance_records || [],
                        payment_records: s.payment_records || [],
                        appendices: s.appendices || []
                    })) : [{ name: '', amount: 0, date: null, acceptance_records: [], payment_records: [], appendices: [] }],
                    note: contract.note || '',
                    drive_folder_id: contract.drive_folder_id || '',
                    drive_folder_link: contract.drive_folder_link || '',
                    files: contract.files || [],
                    content: contract.content || '',
                    joint_venture_members: contract.joint_venture_members || []
                });
            } else {
                setValues({
                    id: '',
                    name: '',
                    contract_number: '',
                    investor_name: '',
                    jv_members: '',
                    category_id: '',
                    start_date: null,
                    end_date: null,
                    stages: [{ name: '', amount: 0, date: null, acceptance_records: [], payment_records: [], appendices: [] }],
                    note: '',
                    drive_folder_id: '',
                    drive_folder_link: '',
                    files: [],
                    content: '',
                    joint_venture_members: []
                });
            }
        }
    }, [open, isEdit, contract]);

    useEffect(() => {
        let intervalId = null;
        
        const hasLocalFiles = (values.files && values.files.some(file => 
            (file.id && file.id.startsWith('local:')) || 
            (file.link && (file.link.startsWith('/') || file.link.startsWith('local:')))
        )) || (values.stages && values.stages.some(stage => 
            (stage.appendices && stage.appendices.some(app => 
                app.files && app.files.some(f => f.id && f.id.startsWith('local:'))
            )) ||
            (stage.acceptance_records && stage.acceptance_records.some(rec => 
                rec.scan_files && rec.scan_files.some(link => link.startsWith('local:'))
            )) ||
            (stage.payment_records && stage.payment_records.some(rec => 
                rec.scan_files && rec.scan_files.some(link => link.startsWith('local:'))
            ))
        ));
        
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
    }, [open, isEdit, contract?.id, values.files, values.stages]);

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
            stages: [...prev.stages, { name: '', amount: 0, date: null, acceptance_records: [], payment_records: [], appendices: [] }]
        }));
    };

    const removeStage = (index) => {
        const newStages = values.stages.filter((_, i) => i !== index);
        setValues(prev => ({ ...prev, stages: newStages }));
    };

    const handleSave = async () => {
        if (!values.name) return;

        if (values.start_date && values.end_date) {
            for (let i = 0; i < values.stages.length; i++) {
                const stage = values.stages[i];
                if (stage.date) {
                    const stDate = dayjs(stage.date);
                    if (stDate.isBefore(values.start_date, 'day') || stDate.isAfter(values.end_date, 'day')) {
                        toast.error(`Ngày của giai đoạn "${stage.name || `Giai đoạn ${i + 1}`}" phải nằm trong thời gian hợp đồng (${values.start_date.format('DD/MM/YYYY')} - ${values.end_date.format('DD/MM/YYYY')}).`);
                        return;
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
