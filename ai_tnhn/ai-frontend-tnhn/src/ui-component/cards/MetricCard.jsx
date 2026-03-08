import PropTypes from 'prop-types';
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const MetricCard = ({ title, value, subtitle, trend, icon, isLoading, color = 'primary' }) => {
    if (isLoading) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="80%" height={48} sx={{ mt: 1 }} />
                    <Skeleton variant="text" width="40%" sx={{ mt: 1 }} />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            sx={{
                height: '100%',
                background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette[color].light} 0%, ${theme.palette[color].main} 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <CardContent>
                {/* Icon Background */}
                {icon && (
                    <Box
                        sx={{
                            position: 'absolute',
                            right: -10,
                            top: -10,
                            opacity: 0.2,
                            fontSize: 100
                        }}
                    >
                        {icon}
                    </Box>
                )}

                {/* Content */}
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="subtitle2" sx={{ opacity: 0.9, mb: 1 }}>
                        {title}
                    </Typography>

                    <Typography variant="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {value}
                    </Typography>

                    {subtitle && (
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            {subtitle}
                        </Typography>
                    )}

                    {/* Trend Indicator */}
                    {trend !== undefined && trend !== null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                            {trend > 0 ? (
                                <TrendingUpIcon sx={{ fontSize: 18 }} />
                            ) : (
                                <TrendingDownIcon sx={{ fontSize: 18 }} />
                            )}
                            <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                {trend > 0 ? `+${trend}%` : `${trend}%`}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

MetricCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    subtitle: PropTypes.string,
    trend: PropTypes.number,
    icon: PropTypes.node,
    isLoading: PropTypes.bool,
    color: PropTypes.oneOf(['primary', 'secondary', 'success', 'error', 'warning', 'info'])
};

export default MetricCard;
