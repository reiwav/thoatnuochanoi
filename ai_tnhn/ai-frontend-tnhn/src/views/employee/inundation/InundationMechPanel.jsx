import React from 'react';
import {
    Box, Typography, Checkbox, FormControlLabel
} from '@mui/material';
import InundationCommonForm from './components/InundationCommonForm';

// Hook
import useInundationMechPanel from './hooks/useInundationMechPanel';

const InundationMechPanel = ({ report, pointId, onSuccess }) => {
    const {
        submitting,
        mechData,
        setMechData,
        handleSubmit,
        watermarkText,
        oldImages
    } = useInundationMechPanel({ report, pointId, onSuccess });

    return (
        <Box sx={{ p: 2 }}>
            <InundationCommonForm
                watermarkText={watermarkText}
                oldImages={oldImages}
                onSubmit={handleSubmit}
                submitText="GỬI CẬP NHẬT"
                submitColor="deepPurple"
                loading={submitting}
                noteValue={mechData.mech_note}
                onNoteChange={(e) => setMechData(prev => ({ ...prev, mech_note: e.target.value }))}
                noteLabel="Thông tin khác"
                notePlaceholder="Nhập ghi chú thêm..."
                noteRows={3}
                depth={mechData.mech_d}
                onDepthChange={(val) => setMechData(prev => ({ ...prev, mech_d: val }))}
                width={mechData.mech_r}
                onWidthChange={(val) => setMechData(prev => ({ ...prev, mech_r: val }))}
                length={mechData.mech_s}
                onLengthChange={(val) => setMechData(prev => ({ ...prev, mech_s: val }))}
                permission="inundation:mechanic"
            >
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={mechData.mech_checked}
                            onChange={(e) => setMechData(prev => ({ ...prev, mech_checked: e.target.checked }))}
                        />
                    }
                    label={<Typography sx={{ fontWeight: 700 }}>Đã ứng trực</Typography>}
                />
            </InundationCommonForm>
        </Box>
    );
};

export default InundationMechPanel;
