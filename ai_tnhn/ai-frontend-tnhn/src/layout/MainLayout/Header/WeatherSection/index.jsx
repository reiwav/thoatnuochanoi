import { useState, useEffect } from 'react';

// material-ui
import { useTheme, styled } from '@mui/material/styles';
import { Box, Typography, Stack, Skeleton, Tooltip, keyframes } from '@mui/material';

// project imports
import weatherApi from 'api/weather';

// assets
import {
  IconCloud,
  IconSun,
  IconCloudRain,
  IconBolt,
  IconCloudFog,
  IconSnowflake,
  IconWind,
  IconCloudStorm
} from '@tabler/icons-react';

const marquee = keyframes`
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const WeatherContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
  height: '40px',
  background: 'transparent', // Bỏ nền theo yêu cầu
  marginRight: theme.spacing(2)
}));

const ScrollingContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  whiteSpace: 'nowrap',
  animation: `${marquee} 40s linear infinite`,
  '&:hover': {
    animationPlayState: 'paused'
  }
}));

const WeatherSection = () => {
  const theme = useTheme();
  const [forecast, setForecast] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await weatherApi.getForecast();
        if (res.data?.status === 'success') {
          setForecast(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch weather:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const getWeatherIcon = (text) => {
    const lower = text.toLowerCase();
    const iconProps = { size: 24, style: { animation: `${pulse} 2s ease-in-out infinite`, marginRight: '8px' } };

    if (lower.includes('dông') || lower.includes('sấm')) return <IconCloudStorm {...iconProps} color={theme.palette.warning.dark} />;
    if (lower.includes('sét')) return <IconBolt {...iconProps} color={theme.palette.warning.main} />;
    if (lower.includes('mưa rào') || lower.includes('mưa to')) return <IconCloudRain {...iconProps} color={theme.palette.info.dark} />;
    if (lower.includes('mưa')) return <IconCloudRain {...iconProps} color={theme.palette.info.main} />;
    if (lower.includes('nắng')) return <IconSun {...iconProps} color="#FF9800" />;
    return <IconCloud {...iconProps} color={theme.palette.primary.main} />;
  };

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, mr: 2 }}>
        <Skeleton variant="text" width="100%" height={30} />
      </Box>
    );
  }

  if (!forecast) return null;

  return (
    <Tooltip title="Dự báo thời tiết Hà Nội 3 ngày tới (AI)" arrow>
      <WeatherContainer sx={{ display: { xs: 'none', lg: 'flex' } }}>
        <Box sx={{ overflow: 'hidden', width: '100%', position: 'relative' }}>
          <ScrollingContent>
            <Stack direction="row" spacing={12} alignItems="center">
              <Stack direction="row" alignItems="center">
                {getWeatherIcon(forecast)}
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: theme.palette.primary.main,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  DỰ BÁO THỜI TIẾT 3 NGÀY TỚI: {forecast}
                </Typography>
              </Stack>
              {/* Thêm khoảng trống và icon phân cách cho dải chạy liên tục */}
              <IconCloud size={20} color={theme.palette.grey[300]} />
            </Stack>
          </ScrollingContent>
        </Box>
      </WeatherContainer>
    </Tooltip>
  );
};

export default WeatherSection;
