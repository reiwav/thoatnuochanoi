import React from 'react';
import StationDialogWrapper from '../shared/StationDialogWrapper';
import StationBaseFields from '../shared/StationBaseFields';
import useInundationDialog from './hooks/useInundationDialog';

const InundationDialog = ({ open, onClose, onSubmit, station, isEdit, organizations }) => {
    const { formData, handleChange, handleSave } = useInundationDialog({
        open,
        isEdit,
        station,
        onClose,
        onSubmit
    });

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
