import React from 'react';
import { Paper, IconButton, Tooltip, Divider, Typography, Box } from '@mui/material';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import ImageIcon from '@mui/icons-material/Image';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import SmartButtonIcon from '@mui/icons-material/SmartButton';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import QrCodeIcon from '@mui/icons-material/QrCode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DataObjectIcon from '@mui/icons-material/DataObject';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import TableChartIcon from '@mui/icons-material/TableChart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TodayIcon from '@mui/icons-material/Today';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import MovieIcon from '@mui/icons-material/Movie';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CelebrationIcon from '@mui/icons-material/Celebration';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import BlockIcon from '@mui/icons-material/Block';
import StarIcon from '@mui/icons-material/Star';
import FestivalIcon from '@mui/icons-material/Festival';
import LensIcon from '@mui/icons-material/Lens';
import CollectionsIcon from '@mui/icons-material/Collections';

const LuckyDrawToolbar = ({ onAdd, selectedId }) => {
    const handleAddEffect = (type) => {
        // Map effect type to default name and props
        const names = {
            'fireworks': 'Hiệu ứng Pháo hoa',
            'confetti': 'Hiệu ứng Kim tuyến',
            'falling-hearts': 'Hiệu ứng Tim bay',
            'snow': 'Hiệu ứng Tuyết rơi',
            'balloons': 'Hiệu ứng Bong bóng',
            'stars': 'Hiệu ứng Sao lấp lánh'
        };

        onAdd('effect', selectedId, {
            name: names[type] || 'New Effect',
            effectProps: {
                effectType: type,
                intensity: 1,
                style: 'burst',
                colors: [],
                customIcon: '',
                color: '#ff0000',
                side: 'both',
                shape: 'round'
            },
            x: 240, // Centered on a 1080 canvas
            y: 660, // Centered on a 1920 canvas
            width: 600,
            height: 600
        });
    };

    return (
        <Paper elevation={0} sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Basic Tools */}
            <Box>
                <Typography variant="caption" sx={{ px: 0.5, pb: 0.5, display: 'block', fontWeight: 'bold', color: 'text.secondary' }}>
                    Cơ bản
                </Typography>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 0.5
                }}>
                    <Tooltip title="Văn bản (Text)" placement="right">
                        <IconButton onClick={() => onAdd('text', selectedId)} size="small">
                            <TextFieldsIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Hình chữ nhật (Box)" placement="right">
                        <IconButton onClick={() => onAdd('box', selectedId)} size="small">
                            <CropSquareIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Hình ảnh (Image)" placement="right">
                        <IconButton onClick={() => onAdd('image', selectedId)} size="small">
                            <ImageIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Hình tròn (Circle)" placement="right">
                        <IconButton onClick={() => onAdd('circle', selectedId)} size="small">
                            <RadioButtonUncheckedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Nút bấm (Button)" placement="right">
                        <IconButton onClick={() => onAdd('button', selectedId)} size="small">
                            <SmartButtonIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Đường kẻ (Line)" placement="right">
                        <IconButton onClick={() => onAdd('line', selectedId)} size="small">
                            <HorizontalRuleIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Nhóm (Group)" placement="right">
                        <IconButton onClick={() => onAdd('group', selectedId)} size="small">
                            <MoveToInboxIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <Divider />

            {/* Dynamic Tools */}
            <Box>
                <Typography variant="caption" sx={{ px: 0.5, pb: 0.5, display: 'block', fontWeight: 'bold', color: 'text.secondary' }}>
                    Động (Dynamic)
                </Typography>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 0.5
                }}>
                    <Tooltip title="Mã QR (QR Code)" placement="right">
                        <IconButton onClick={() => onAdd('qrcode', selectedId)} size="small" color="primary">
                            <QrCodeIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Ảnh đại diện (Avatar)" placement="right">
                        <IconButton onClick={() => onAdd('avatar', selectedId)} size="small" color="primary">
                            <AccountCircleIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Văn bản động (Dynamic Text)" placement="right">
                        <IconButton onClick={() => onAdd('dynamic-text', selectedId)} size="small" color="primary">
                            <DataObjectIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <Divider />

            {/* Multimedia/Advanced Tools */}
            <Box>
                <Typography variant="caption" sx={{ px: 0.5, pb: 0.5, display: 'block', fontWeight: 'bold', color: 'text.secondary' }}>
                    Nâng cao
                </Typography>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 0.5
                }}>
                    <Tooltip title="Trình chiếu (Slideshow)" placement="right">
                        <IconButton onClick={() => onAdd('slide', selectedId)} size="small" color="secondary">
                            <SlideshowIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Bảng (Table)" placement="right">
                        <IconButton onClick={() => onAdd('table', selectedId)} size="small" color="secondary">
                            <TableChartIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Đồng hồ (Clock)" placement="right">
                        <IconButton onClick={() => onAdd('clock', selectedId)} size="small" color="secondary">
                            <AccessTimeIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Ngày giờ (Date/Time)" placement="right">
                        <IconButton onClick={() => onAdd('time', selectedId)} size="small" color="secondary">
                            <TodayIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Video" placement="right">
                        <IconButton onClick={() => onAdd('video', selectedId)} size="small" color="secondary">
                            <MovieIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Âm thanh (Audio)" placement="right">
                        <IconButton onClick={() => onAdd('audio', selectedId)} size="small" color="secondary">
                            <MusicNoteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <Divider />

            {/* Actions */}
            <Box>
                <Typography variant="caption" sx={{ px: 0.5, pb: 0.5, display: 'block', fontWeight: 'bold', color: 'text.secondary' }}>
                    Sự kiện (Actions)
                </Typography>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 0.5
                }}>
                    <Tooltip title="Checkin Thành công" placement="right">
                        <IconButton onClick={() => onAdd('action-success', selectedId)} size="small" sx={{ color: 'success.main' }}>
                            <CheckCircleIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Checkin Thất bại" placement="right">
                        <IconButton onClick={() => onAdd('action-failed', selectedId)} size="small" sx={{ color: 'error.main' }}>
                            <CancelIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Thư viện Checkin" placement="right">
                        <IconButton onClick={() => onAdd('checkin-gallery', selectedId)} size="small" color="primary">
                            <CollectionsIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <Divider />

            {/* Effects */}
            <Box>
                <Typography variant="caption" sx={{ px: 0.5, pb: 0.5, display: 'block', fontWeight: 'bold', color: 'text.secondary' }}>
                    Hiệu ứng (Effects)
                </Typography>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 0.5
                }}>
                    <Tooltip title="Pháo hoa (Fireworks)" placement="right">
                        <IconButton onClick={() => handleAddEffect('fireworks')} size="small" color="secondary">
                            <CelebrationIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Tim bay (Hearts)" placement="right">
                        <IconButton onClick={() => handleAddEffect('falling-hearts')} size="small" color="secondary">
                            <FavoriteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Tuyết rơi (Snow)" placement="right">
                        <IconButton onClick={() => handleAddEffect('snow')} size="small" color="secondary">
                            <AcUnitIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Bong bóng (Balloons)" placement="right">
                        <IconButton onClick={() => handleAddEffect('balloons')} size="small" color="secondary">
                            <LensIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Sao lấp lánh (Stars)" placement="right">
                        <IconButton onClick={() => handleAddEffect('stars')} size="small" color="secondary">
                            <StarIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Kim tuyến (Confetti)" placement="right">
                        <IconButton onClick={() => handleAddEffect('confetti')} size="small" color="secondary">
                            <FestivalIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        </Paper>
    );
};

export default LuckyDrawToolbar;
