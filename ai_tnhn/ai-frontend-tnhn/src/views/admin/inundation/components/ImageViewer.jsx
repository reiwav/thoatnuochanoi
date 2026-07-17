import React from 'react';
import { Box, Typography, Dialog, DialogContent, IconButton, Grid } from '@mui/material';
import { IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { getInundationImageUrl } from 'utils/imageHelper';

const ImageViewer = ({ viewer, onClose, onPrev, onNext, onSelect }) => {
    // Normalize images to always be objects with {url, group}
    const normalizedImages = viewer.images.map(img => {
        if (typeof img === 'string') return { url: img, group: 'Khác' };
        return img;
    });

    const groupedImages = normalizedImages.reduce((acc, img, idx) => {
        if (!acc[img.group]) acc[img.group] = [];
        acc[img.group].push({ ...img, globalIndex: idx });
        return acc;
    }, {});

    return (
        <Dialog
            open={viewer.open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            slotProps={{ paper: { sx: { bgcolor: 'black', borderRadius: 4, overflow: 'hidden', position: 'relative' } } }}
        >
            <IconButton
                onClick={onClose}
                sx={{
                    position: 'absolute', top: 16, right: 16, zIndex: 10,
                    color: 'white', bgcolor: 'rgba(0,0,0,0.5)',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                }}
            >
                <IconX size={20} />
            </IconButton>
            <DialogContent sx={{ p: 0, display: 'flex', minHeight: '80vh', position: 'relative' }}>
                {normalizedImages.length > 0 && (
                    <Box sx={{ width: 280, bgcolor: 'grey.900', borderRight: '1px solid', borderColor: 'grey.800', overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>Hình ảnh báo cáo</Typography>
                        {Object.entries(groupedImages).map(([groupName, imgs]) => (
                            <Box key={groupName}>
                                <Typography variant="subtitle2" sx={{ color: 'grey.400', fontWeight: 600, mb: 1 }}>{groupName}</Typography>
                                <Grid container spacing={1}>
                                    {imgs.map(img => (
                                        <Grid item xs={4} key={img.globalIndex}>
                                            <Box
                                                onClick={() => onSelect && onSelect(img.globalIndex)}
                                                sx={{
                                                    width: '100%', aspectRatio: '1', borderRadius: 1.5, overflow: 'hidden', cursor: 'pointer',
                                                    border: '2px solid',
                                                    borderColor: viewer.index === img.globalIndex ? 'primary.main' : 'transparent',
                                                    opacity: viewer.index === img.globalIndex ? 1 : 0.6,
                                                    transition: 'all 0.2s',
                                                    '&:hover': { opacity: 1, borderColor: viewer.index === img.globalIndex ? 'primary.main' : 'grey.600' }
                                                }}
                                            >
                                                <img src={getInundationImageUrl(img.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        ))}
                    </Box>
                )}
                <Box sx={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'black' }}>
                    {normalizedImages.length > 1 && (
                        <>
                            <IconButton
                                onClick={onPrev}
                                sx={{ position: 'absolute', left: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}
                            >
                                <IconChevronLeft size={32} />
                            </IconButton>
                            <IconButton
                                onClick={onNext}
                                sx={{ position: 'absolute', right: 16, zIndex: 10, color: 'white', bgcolor: 'rgba(0,0,0,0.3)' }}
                            >
                                <IconChevronRight size={32} />
                            </IconButton>
                        </>
                    )}
                    {normalizedImages[viewer.index] && (
                        <Box
                            component="img"
                            src={getInundationImageUrl(normalizedImages[viewer.index].url)}
                            sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
                        />
                    )}
                    {normalizedImages.length > 0 && (
                        <Box sx={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
                            <Typography sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.5)', display: 'inline-block', px: 2, py: 0.5, borderRadius: 10, fontSize: '0.85rem' }}>
                                {viewer.index + 1} / {normalizedImages.length}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ImageViewer;
