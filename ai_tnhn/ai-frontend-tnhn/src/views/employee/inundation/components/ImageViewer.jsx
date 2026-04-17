import React from 'react';
import { Box, Typography, Dialog, DialogContent, IconButton } from '@mui/material';
import { IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { getInundationImageUrl } from 'utils/imageHelper';

const ImageViewer = ({ viewer, onClose, onPrev, onNext }) => {
    return (
        <Dialog
            open={viewer.open}
            onClose={onClose}
            maxWidth="lg"
            PaperProps={{ sx: { bgcolor: 'black', borderRadius: 4, overflow: 'hidden', position: 'relative' } }}
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
            <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', position: 'relative' }}>
                {viewer.images.length > 1 && (
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
                <Box
                    component="img"
                    src={getInundationImageUrl(viewer.images[viewer.index])}
                    sx={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
                />
                <Box sx={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
                    <Typography sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.5)', display: 'inline-block', px: 2, py: 0.5, borderRadius: 10, fontSize: '0.85rem' }}>
                        {viewer.index + 1} / {viewer.images.length}
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ImageViewer;
