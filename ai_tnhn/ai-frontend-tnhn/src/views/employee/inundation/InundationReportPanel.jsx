import { useState, useEffect } from 'react';
import {
    TextField, Typography, InputAdornment, FormControlLabel, Checkbox, MenuItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { IconMapPin } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

import inundationApi from 'api/inundation';
import InundationCommonForm from './components/InundationCommonForm';

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
    const [loading, setLoading] = useState(false);
    const [values, setValues] = useState({
        street_name: initialStreetName || '',
        length: '',
        width: '',
        depth: '',
        description: '',
        traffic_status: 'Đi lại bình thường',
        point_id: ''
    });
    const [resolveOnUpdate, setResolveOnUpdate] = useState(false);
    const [points, setPoints] = useState([]);

    // Chỉ fetch danh sách điểm khi ở chế độ enterprise và không có pointId
    const isEnterpriseMode = apiMode === 'enterprise';

    useEffect(() => {
        if (isEnterpriseMode && !pointId && !selectedReport) {
            fetchPoints();
        }
    }, [pointId, selectedReport, isEnterpriseMode]);

    const fetchPoints = async () => {
        try {
            const res = await inundationApi.getPointsStatus({ per_page: 1000 });
            setPoints(res || []);
        } catch (err) {
            console.error('Lỗi tải danh sách điểm ngập:', err);
        }
    };

    // Load dữ liệu cũ từ selectedReport (chỉ cho enterprise)
    useEffect(() => {
        if (selectedReport && isEnterpriseMode) {
            setValues({
                street_name: selectedReport.street_name || '',
                length: selectedReport.length || '',
                width: selectedReport.width || '',
                depth: selectedReport.depth || '',
                description: selectedReport.description || '',
                traffic_status: selectedReport.traffic_status || selectedReport.trafficStatus || 'Đi lại bình thường',
                point_id: selectedReport.point_id || ''
            });
        }
    }, [selectedReport, isEnterpriseMode]);



    // ─── API submit cho Survey / Mech / KTCL ────────────────
    const handleTechnicalSubmit = async (images, clearImagesCallback) => {
        const pId = pointId || values.point_id;
        if (!pId) { toast.error('Thiếu điểm ngập'); return; }
        setLoading(true);
        try {
            const fd = new FormData();
            if (apiMode === 'survey') {
                fd.append('survey_checked', 'true');
                fd.append('survey_note', values.description);
                if (values.depth) fd.append('survey_d', parseFloat(values.depth) || 0);
                if (values.width) fd.append('survey_r', values.width);
                if (values.length) fd.append('survey_s', values.length);
            } else if (apiMode === 'mech') {
                fd.append('mech_checked', 'true');
                fd.append('mech_note', values.description);
                if (values.depth) fd.append('mech_d', parseFloat(values.depth) || 0);
                if (values.width) fd.append('mech_r', values.width);
                if (values.length) fd.append('mech_s', values.length);
            } else if (apiMode === 'ktcl') {
                fd.append('ktcl_checked', 'true');
                fd.append('ktcl_note', values.description);
                if (values.depth) fd.append('ktcl_d', parseFloat(values.depth) || 0);
                if (values.width) fd.append('ktcl_r', values.width);
                if (values.length) fd.append('ktcl_s', values.length);
            }
            images.forEach(img => fd.append('images', img));

            if (apiMode === 'survey') {
                await inundationApi.reportSurvey(pId, fd);
                toast.success('Cập nhật TK Giám sát thành công');
            } else if (apiMode === 'mech') {
                await inundationApi.reportMech(pId, fd);
                toast.success('Cập nhật XN Cơ giới thành công');
            } else if (apiMode === 'ktcl') {
                await inundationApi.reportKTCL(pId, fd);
                toast.success('Cập nhật KT-CL thành công');
            }

            setValues(v => ({ ...v, description: '' }));
            if (clearImagesCallback) clearImagesCallback();
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    // ─── API submit cho Enterprise (update) ─────────────────
    const handleEnterpriseUpdate = async (images, clearImagesCallback) => {
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('description', values.description);
            if (values.length) fd.append('length', values.length);
            if (values.width) fd.append('width', values.width);
            if (values.depth) fd.append('depth', parseFloat(values.depth) || 0);
            if (values.traffic_status) fd.append('traffic_status', values.traffic_status);

            if (resolveOnUpdate) fd.append('resolve', 'true');
            images.forEach(img => fd.append('images', img));

            const pId = pointId || selectedReport?.point_id || values.point_id;

            if (isCorrectionMode) {
                if (selectedReport.type === 'start' && !selectedReport.is_update_record) {
                    await inundationApi.correctEnterpriseReport(pId, fd);
                    toast.success('Đã lưu thay đổi báo cáo chính');
                } else {
                    await inundationApi.correctEnterpriseSituation(pId, fd);
                    toast.success('Đã lưu thay đổi chỉnh sửa');
                }
            } else {
                await inundationApi.reportEnterpriseSituation(pId, fd);
                toast.success(resolveOnUpdate ? 'Đã kết thúc đợt ngập' : 'Cập nhật thành công');
            }

            setValues(v => ({ ...v, description: '', traffic_status: 'Đi lại bình thường' }));
            setResolveOnUpdate(false);
            if (clearImagesCallback) clearImagesCallback();
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    // ─── API submit cho Enterprise (create) ─────────────────
    const handleEnterpriseCreate = async (images, clearImagesCallback) => {
        if (!values.street_name) { toast.error('Vui lòng nhập tên tuyến đường'); return; }
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('street_name', values.street_name);
            if (values.length) fd.append('length', values.length);
            if (values.width) fd.append('width', values.width);
            if (values.depth) fd.append('depth', parseFloat(values.depth) || 0);
            fd.append('description', values.description);
            if (values.traffic_status) fd.append('traffic_status', values.traffic_status);
            const pId = pointId || values.point_id;
            if (pId) fd.append('point_id', pId);
            images.forEach(img => fd.append('images', img));
            await inundationApi.reportEnterprise(pId, fd);
            toast.success('Gửi báo cáo thành công');
            setValues({ ...values, length: '', width: '', depth: '', description: '', traffic_status: 'Đi lại bình thường' });
            if (clearImagesCallback) clearImagesCallback();
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Đã có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    // ─── Unified submit handler ─────────────────────────────
    const handleSubmit = async (images, clearImagesCallback) => {
        if (!isEnterpriseMode) {
            return handleTechnicalSubmit(images, clearImagesCallback);
        }
        if (selectedReport) {
            return handleEnterpriseUpdate(images, clearImagesCallback);
        }
        return handleEnterpriseCreate(images, clearImagesCallback);
    };

    // ─── Dynamic labels dựa trên mode ──────────────────────
    const modeConfig = {
        enterprise: { noteLabel: 'Mô tả diễn biến ngập', notePlaceholder: 'Nhập mô tả diễn biến...', dLabel: 'Sâu', rLabel: 'Rộng', sLabel: 'Dài', submitColor: 'secondary' },
        ktcl:       { noteLabel: 'Nhận xét KT-CL',        notePlaceholder: 'Nhập nhận xét KT-CL...',   dLabel: 'Sâu', rLabel: 'Rộng', sLabel: 'Dài', submitColor: 'warning' },
        survey:     { noteLabel: 'Ghi chú TK Giám sát',  notePlaceholder: 'Nhập ghi chú giám sát...', dLabel: 'Sâu', rLabel: 'Rộng', sLabel: 'Dài', submitColor: 'primary' },
        mech:       { noteLabel: 'Ghi chú Cơ giới',      notePlaceholder: 'Nhập ghi chú cơ giới...',  dLabel: 'Sâu', rLabel: 'Rộng', sLabel: 'Dài', submitColor: 'deepPurple' }
    };
    const cfg = modeConfig[apiMode] || modeConfig.enterprise;

    const watermarkText = values.street_name || (points.find(p => p.id === values.point_id)?.street_name) || initialStreetName || '';

    // Old images
    const oldImages = isCorrectionMode ? (selectedReport?.images || []) : [];

    // Submit text
    const getSubmitText = () => {
        if (!isEnterpriseMode) {
            if (apiMode === 'survey') return 'Gửi cập nhật TK Giám sát';
            if (apiMode === 'mech') return 'Gửi cập nhật Cơ giới';
            if (apiMode === 'ktcl') return 'Gửi cập nhật KT-CL';
        }
        if (isCorrectionMode) return 'Lưu thay đổi chỉnh sửa';
        if (resolveOnUpdate) return 'Xác nhận Kết thúc đợt ngập';
        if (selectedReport) return 'Cập nhật tình hình';
        return 'Gửi báo cáo';
    };

    const getSubmitColor = () => {
        if (!isEnterpriseMode) return cfg.submitColor;
        if (isCorrectionMode) return 'error';
        if (resolveOnUpdate) return 'error';
        return 'secondary';
    };

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
