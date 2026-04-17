import React from 'react';
import { Box, Typography, Stack, Chip } from '@mui/material';
import { IconCheck, IconMessage2, IconAlertTriangle } from '@tabler/icons-react';
import { getInundationImageUrl } from 'utils/imageHelper';
import { formatDateTime } from 'utils/dataHelper';

export const SurveyInfoSection = ({ latest, handleOpenViewer }) => {
    if (!latest?.survey_checked && !latest?.survey_note && !latest?.survey_images?.length) return null;

    return (
        <Box sx={{ p: 1.5, bgcolor: 'primary.lighter', borderRadius: 2, border: '1px solid', borderColor: 'primary.main', mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', textTransform: 'uppercase' }}>
                    ⚡️ KHẢO SÁT THIẾT KẾ:
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
            {latest?.survey_images?.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
                    {latest.survey_images.map((img, i) => (
                        <Box
                            key={i} component="img" src={getInundationImageUrl(img)}
                            onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.survey_images, i); }}
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
                    ⚙️ XN CƠ GIỚI:
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
                <Chip label={`D: ${latest.mech_d || '-'}`} size="small" variant="outlined" color="secondary" sx={{ fontWeight: 800 }} />
                <Chip label={`R: ${latest.mech_r || '-'}`} size="small" variant="outlined" color="secondary" sx={{ fontWeight: 800 }} />
                <Chip label={`S: ${latest.mech_s || '-'}`} size="small" variant="outlined" color="secondary" sx={{ fontWeight: 800 }} />
            </Stack>
            {latest.mech_note && <Typography variant="body2" sx={{ fontWeight: 600 }}>{latest.mech_note}</Typography>}
            {latest?.mech_images?.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
                    {latest.mech_images.map((img, i) => (
                        <Box
                            key={i} component="img" src={getInundationImageUrl(img)}
                            onClick={(e) => { e.stopPropagation(); handleOpenViewer(latest.mech_images, i); }}
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
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconAlertTriangle size={14} /> RÀ SOÁT:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.dark', display: 'block' }}>{latest.review_comment}</Typography>
            {latest.reviewer_name && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.disabled', fontStyle: 'italic' }}>
                    — {latest.reviewer_name}
                </Typography>
            )}
        </Box>
    );
};
