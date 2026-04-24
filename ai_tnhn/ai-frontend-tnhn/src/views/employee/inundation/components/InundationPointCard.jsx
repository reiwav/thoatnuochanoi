import React, { useState, useMemo } from 'react';
import { Paper, Stack, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { IconClock } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';

import inundationApi from 'api/inundation';
import { getLatestData } from 'utils/inundationUtils';
import { formatDuration } from 'utils/dataHelper';
import { 
    CardHeader, 
    CardMetrics, 
    CardActions, 
    CardExpandedContent 
} from './InundationCardComponents';
import ConfirmDialog from 'ui-component/ConfirmDialog';

const InundationPointCard = ({ point, openTask, handleOpenViewer, onOpenDetail, onRefresh }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const latestData = useMemo(() => {
        return getLatestData(point.last_report || point);
    }, [point.last_report, point]);

    const activeData = isHighPriority ? latestData : null;

    const isHighPriority = !!point.report_id;

    const handleQuickFinish = () => {
        setConfirmOpen(true);
    };

    const executeQuickFinish = async () => {
        setConfirmOpen(false);
        setFinishing(true);
        try {
            await inundationApi.quickFinish(point.id);
            toast.success(`Đã kết thúc đợt ngập "${point.name}" thành công`);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Quick finish error:', error);
            toast.error(error.response?.data?.error || 'Không thể kết thúc đợt ngập');
        } finally {
            setFinishing(false);
        }
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.5,
                borderRadius: 5,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid',
                borderColor: isHighPriority ? alpha(theme.palette.error.main, 0.2) : 'divider',
                boxShadow: isHighPriority
                    ? `0 10px 30px -10px ${alpha(theme.palette.error.main, 0.15)}`
                    : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isHighPriority
                    ? `linear-gradient(135deg, ${alpha(latestData?.flood_level_color || theme.palette.error.main, 0.01)} 0%, #ffffff 100%)`
                    : '#ffffff',
                position: 'relative',
                overflow: 'hidden',
                '&::before': isHighPriority ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 6,
                    height: '100%',
                    bgcolor: latestData?.flood_level_color || 'error.main'
                } : {},
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: isHighPriority
                        ? `0 20px 40px -12px ${alpha(theme.palette.error.main, 0.2)}`
                        : theme.shadows[8],
                    borderColor: isHighPriority ? 'error.main' : 'primary.light'
                },
                animation: (activeData?.needs_correction && !activeData?.is_review_updated) ? 'aggressiveBlink 1.5s infinite alternate' : 'none',
                '@keyframes aggressiveBlink': {
                    '0%': { 
                        borderColor: theme.palette.warning.main,
                        boxShadow: `0 0 20px ${alpha(theme.palette.warning.main, 0.5)}`,
                        backgroundColor: alpha(theme.palette.warning.main, 0.05)
                    },
                    '100%': { 
                        borderColor: 'transparent',
                        boxShadow: 'none',
                        backgroundColor: '#ffffff'
                    }
                }
            }}
        >
            <CardHeader 
                point={point} 
                latest={activeData} 
                isHighPriority={isHighPriority} 
                navigate={navigate} 
                openTask={openTask} 
                onQuickFinish={handleQuickFinish}
                onOpenDetail={onOpenDetail}
                finishing={finishing}
                theme={theme} 
            />

            {/* Sub-Header: Start Time for Active Reports */}
            {isHighPriority && (point.last_report?.created_at || point.last_report?.start_time) && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, px: 1, py: 0.5, bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: 1.5 }}>
                    <IconClock size={14} color={theme.palette.error.main} />
                    <Stack direction="row" spacing={0.5} alignItems="baseline">
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.palette.error.main }}>
                            Bắt đầu từ: {new Date((point.last_report.created_at || point.last_report.start_time) * 1000).toLocaleTimeString()}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: alpha(theme.palette.error.main, 0.7) }}>
                            ({formatDuration(point.last_report.created_at || point.last_report.start_time)})
                        </span>
                    </Stack>
                </Stack>
            )}

            <CardMetrics 
                isHighPriority={isHighPriority} 
                latest={latestData} 
                theme={theme} 
            />

            <CardActions 
                expanded={expanded} 
                setExpanded={setExpanded} 
                isHighPriority={isHighPriority} 
                point={point} 
                latest={activeData}
                openTask={openTask} 
            />

            <CardExpandedContent 
                expanded={expanded} 
                latest={activeData} 
                isHighPriority={isHighPriority} 
                handleOpenViewer={handleOpenViewer} 
            />

            <style>{`
                @keyframes pulse { 
                    0% { transform: scale(1); opacity: 1; } 
                    50% { transform: scale(1.1); opacity: 0.8; } 
                    100% { transform: scale(1); opacity: 1; } 
                }
            `}</style>

            <ConfirmDialog
                open={confirmOpen}
                title="Xác nhận kết thúc"
                description={`Bạn có chắc chắn muốn kết thúc đợt ngập tại "${point.name}"?`}
                onConfirm={executeQuickFinish}
                onClose={() => setConfirmOpen(false)}
                color="success"
                confirmText="Kết thúc ngay"
                cancelText="Quay lại"
            />
        </Paper>
    );
};

export default InundationPointCard;
