import { useState, useEffect, useMemo } from 'react';

const useSelectionDialog = ({ open, items, initialSelectedIds, labelField, singleSelect, onConfirm, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        if (open) {
            setSelectedIds(initialSelectedIds);
            setSearchTerm('');
        }
    }, [open, initialSelectedIds]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        const lowerSearch = searchTerm.toLowerCase();
        return items.filter(item => 
            (item[labelField] || '').toLowerCase().includes(lowerSearch)
        );
    }, [items, searchTerm, labelField]);

    const handleToggle = (id) => {
        if (singleSelect) {
            setSelectedIds(prev => prev.includes(id) ? [] : [id]);
            return;
        }
        const currentIndex = selectedIds.indexOf(id);
        const newSelected = [...selectedIds];

        if (currentIndex === -1) {
            newSelected.push(id);
        } else {
            newSelected.splice(currentIndex, 1);
        }

        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.length === items.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map(i => i.id));
        }
    };

    const handleConfirm = () => {
        onConfirm(selectedIds);
        onClose();
    };

    return {
        searchTerm,
        setSearchTerm,
        selectedIds,
        filteredItems,
        handleToggle,
        handleSelectAll,
        handleConfirm
    };
};

export default useSelectionDialog;
