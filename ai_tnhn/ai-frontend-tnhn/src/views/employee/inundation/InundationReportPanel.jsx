import {
    TextField, Typography, InputAdornment, FormControlLabel, Checkbox, MenuItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconMapPin } from '@tabler/icons-react';

import InundationCommonForm from './components/InundationCommonForm';

// Hook
import useInundationReportPanel from './hooks/useInundationReportPanel';

/**
 * apiMode:
 *  - 'enterprise'  → Báo cáo Địa bàn   (reportEnterprise / reportEnterpriseSituation)
 *  - 'ktcl'         → Báo cáo KT-CL      (reportEnterprise / reportEnterpriseSituation - cùng API)
 *  - 'survey'       → TK Giám sát        (reportSurvey)
 *  - 'mech'         → XN Cơ giới         (reportMech)
 */
const InundationReportPanel = ({
    selectedReport,
    pointId,
    initialStreetName,
    onSuccess,
    isCorrectionMode = false,
    permission = 'inundation:enterprise_report',
    apiMode = 'enterprise'
}) => {
    const theme = useTheme();
    const {
        loading,
        values,
        setValues,
        resolveOnUpdate,
        setResolveOnUpdate,
        points,
        isEnterpriseMode,
        watermarkText,
        oldImages,
        cfg,
        handleSubmit,
        getSubmitText,
        getSubmitColor
    } = useInundationReportPanel({
        selectedReport,
        pointId,
        initialStreetName,
        onSuccess,
        isCorrectionMode,
        apiMode
    });

    return (
        <InundationCommonForm
            watermarkText={watermarkText}
            oldImages={oldImages}
            onSubmit={handleSubmit}
            submitText={getSubmitText()}
            submitColor={getSubmitColor()}
            loading={loading}
            noteValue={values.description}
            onNoteChange={(e) => setValues(prev => ({ ...prev, description: e.target.value }))}
            noteLabel={cfg.noteLabel}
            notePlaceholder={cfg.notePlaceholder}
            noteRows={3}
            depth={values.depth}
            onDepthChange={(val) => setValues(prev => ({ ...prev, depth: val }))}
            depthLabel={cfg.dLabel}
            width={values.width}
            onWidthChange={(val) => setValues(prev => ({ ...prev, width: val }))}
            widthLabel={cfg.rLabel}
            length={values.length}
            onLengthChange={(val) => setValues(prev => ({ ...prev, length: val }))}
            lengthLabel={cfg.sLabel}
            permission={permission}
        >
            {/* Chọn điểm ngập - chỉ ở chế độ enterprise/ktcl khi không truyền pointId */}
            {isEnterpriseMode && !pointId && !selectedReport && (
                points.length > 0 ? (
                    <TextField
                        select
                        fullWidth label="Chọn điểm ngập" name="point_id"
                        value={values.point_id || ''}
                        onChange={(e) => {
                            const p = points.find(p => p.id === e.target.value);
                            setValues(prev => ({
                                ...prev,
                                point_id: e.target.value,
                                street_name: p ? p.street_name : ''
                            }));
                        }}
                        required
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start"><IconMapPin size={17} color={theme.palette.text.secondary} /></InputAdornment>
                            }
                        }}
                    >
                        {points.map((p) => (
                            <MenuItem key={p.id} value={p.id}>{p.street_name}</MenuItem>
                        ))}
                    </TextField>
                ) : (
                    <TextField
                        fullWidth label="Tên tuyến đường / Vị trí" name="street_name"
                        value={values.street_name} onChange={(e) => setValues(prev => ({ ...prev, street_name: e.target.value }))} required
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start"><IconMapPin size={17} color={theme.palette.text.secondary} /></InputAdornment>
                            }
                        }}
                    />
                )
            )}

            {/* Checkbox kết thúc ngập - chỉ enterprise/ktcl khi có selectedReport */}
            {isEnterpriseMode && selectedReport && (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={resolveOnUpdate}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setResolveOnUpdate(checked);
                                if (checked) {
                                    setValues(prev => ({
                                        ...prev,
                                        length: '0',
                                        width: '0',
                                        depth: '0',
                                        traffic_status: 'Đi lại bình thường'
                                    }));
                                }
                            }}
                            color="error"
                        />
                    }
                    label={<Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'error.main' }}>Đã hết ngập (Kết thúc đợt này)</Typography>}
                    sx={{ mt: -1, mb: 1 }}
                />
            )}
        </InundationCommonForm>
    );
};

export default InundationReportPanel;
