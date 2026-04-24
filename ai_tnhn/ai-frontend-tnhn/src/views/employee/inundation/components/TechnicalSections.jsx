import React from 'react';
import { Box, Typography, Stack, Chip, alpha } from '@mui/material';
import { IconCheck, IconMessage2, IconAlertTriangle } from '@tabler/icons-react';
import { getInundationImageUrl } from 'utils/imageHelper';
import { formatDateTime } from 'utils/dataHelper';

export const ReportInfoSection = ({ latest, handleOpenViewer }) => {
    if (!latest) return null;
    const color = latest.flood_level_color || '#5e35b1'; // Fallback to secondary if color not available

    return (
        <Box sx={{ p: 1.2, bgcolor: alpha(color, 0.04), borderRadius: 1.5, border: '1px solid', borderColor: alpha(color, 0.1), mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', mb: 1, display: 'block', fontSize: '0.7rem' }}>
                📍 Báo cáo hiện trường:
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} alignItems="center">
                <Box sx={{
                    px: 1, py: 0.2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: 'text.primary' }}>
                        {latest.length || '?'} <span style={{ color: '#aaa', fontSize: '0.7rem', margin: '0 2px' }}>x</span>
                        {latest.width || '?'} <span style={{ color: '#aaa', fontSize: '0.7rem', margin: '0 2px' }}>x</span>
                        <span style={{ color: color }}>{latest.depth || 0}</span>
                    </Typography>
                </Box>
                <Chip
                    label={latest.traffic_status || 'Bình thường'}
                    size="small"
                    variant="contained"
                    sx={{
                        fontWeight: 800,
                        borderRadius: 1,
                        bgcolor: color,
                        height: 24,
                        fontSize: '0.7rem',
                        px: 0.5
                    }}
                />
            </Stack>

            {latest.description && (
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
                    {latest.description}
                </Typography>
            )}

            {latest?.images?.filter(img => !!img).length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
                    {latest.images.filter(img => !!img).map((img, i) => (
                        <Box
                            key={i} component="img" src={getInundationImageUrl(img)}
                            onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.images.filter(i => !!i), i); }}
                            sx={{ width: 60, height: 60, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'secondary.light', '&:hover': { borderColor: 'secondary.main', transform: 'scale(1.05)' }, transition: 'all 0.2s' }}
                        />
                    ))}
                </Box>
            )}

            {latest?.review_comment && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                    <ReviewCommentSection latest={latest} />
                </Box>
            )}
        </Box>
    );
};

export const SurveyInfoSection = ({ latest, handleOpenViewer }) => {
    if (!latest?.survey_checked && !latest?.survey_note && !latest?.survey_images?.length) return null;

    return (
        <Box sx={{ p: 1.5, bgcolor: 'primary.lighter', borderRadius: 2, border: '1px solid', borderColor: 'primary.main', mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', textTransform: 'uppercase' }}>
                    ⚡️ Xí nghiệp KSTK:
                </Typography>
                {latest.survey_checked && (
                    <Chip
                        label="ĐÃ KIỂM TRA"
                        size="small"
                        color="success"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 900 }}
                    />
                )}
            </Box>
            {latest.survey_note && <Typography variant="body2" sx={{ fontWeight: 600 }}>{latest.survey_note}</Typography>}
            {latest?.survey_images?.filter(img => !!img).length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
                    {latest.survey_images.filter(img => !!img).map((img, i) => (
                        <Box
                            key={i} component="img" src={getInundationImageUrl(img)}
                            onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.survey_images.filter(i => !!i), i); }}
                            sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'primary.main' }}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
};

export const MechInfoSection = ({ latest, handleOpenViewer }) => {
    if (!latest?.mech_checked && !latest?.mech_note && !latest?.mech_d && !latest?.mech_images?.length) return null;

    return (
        <Box sx={{ p: 1.5, bgcolor: 'secondary.lighter', borderRadius: 2, border: '1px solid', borderColor: 'secondary.main', mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 900, color: 'secondary.main', textTransform: 'uppercase' }}>
                    ⚙️ CG xử lý:
                </Typography>
                {latest.mech_checked && (
                    <Chip
                        label="ĐÃ ỨNG TRỰC"
                        size="small"
                        color="success"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 900 }}
                    />
                )}
            </Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip label={`D: ${latest.mech_d != null ? latest.mech_d : '-'}`} size="small" variant="outlined" color="secondary" sx={{ fontWeight: 800 }} />
                <Chip label={`R: ${latest.mech_r || '-'}`} size="small" variant="outlined" color="secondary" sx={{ fontWeight: 800 }} />
                <Chip label={`S: ${latest.mech_s || '-'}`} size="small" variant="outlined" color="secondary" sx={{ fontWeight: 800 }} />
            </Stack>
            {latest.mech_note && <Typography variant="body2" sx={{ fontWeight: 600 }}>{latest.mech_note}</Typography>}
            {latest?.mech_images?.filter(img => !!img).length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
                    {latest.mech_images.filter(img => !!img).map((img, i) => (
                        <Box
                            key={i} component="img" src={getInundationImageUrl(img)}
                            onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.mech_images.filter(i => !!i), i); }}
                            sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', cursor: 'pointer', border: '1px solid', borderColor: 'secondary.main' }}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
};

export const ReviewCommentSection = ({ latest }) => {
    if (!latest?.review_comment) return null;

    return (
        <Box sx={{ p: 1, bgcolor: 'error.lighter', borderRadius: 1.5, borderLeft: '3px solid', borderColor: 'error.main' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconAlertTriangle size={14} /> Nhận xét:
                </Typography>
                {latest.is_review_updated && (
                    <Chip
                        label="ĐÃ CHỈNH SỬA"
                        size="small"
                        color="success"
                        icon={<IconCheck size={12} />}
                        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900, borderRadius: 1 }}
                    />
                )}
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.dark', display: 'block' }}>{latest.review_comment}</Typography>
            {latest.reviewer_name && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.disabled', fontStyle: 'italic' }}>
                    — {latest.reviewer_name}
                </Typography>
            )}
        </Box>
    );
};
