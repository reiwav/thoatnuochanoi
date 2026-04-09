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

let memoizedForecast = '';

const WeatherSection = () => {
  const theme = useTheme();
  const [forecast, setForecast] = useState(memoizedForecast);
  const [loading, setLoading] = useState(!memoizedForecast);

  useEffect(() => {
    if (memoizedForecast) return;

    const fetchWeather = async () => {
      try {
        const res = await weatherApi.getForecast();
        if (res.data?.status === 'success') {
          memoizedForecast = res.data.data;
          setForecast(memoizedForecast);
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
    if (lower.includes('sương mù') || lower.includes('mù')) return <IconCloudFog {...iconProps} color={theme.palette.info.main} />;
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

  const forecastLines = forecast
    .replace(/Dự báo thời tiết 3 ngày tới:?\s*/i, '')
    .split('\n')
    .map(line => line.trim().replace(/^-?\s*/, '')) // Bỏ dấu - ở đầu
    .filter(line => line.length > 0);

  const getSmallWeatherIcon = (text) => {
    // Chỉ lấy phần mô tả thời tiết (nằm trước dấu chấm phẩy đầu tiên) để tránh bắt nhầm chữ "mưa" trong "Tỉ lệ mưa"
    const description = text.split(';')[0].toLowerCase();
    const iconProps = { size: 14, style: { marginRight: '6px' } };

    if (description.includes('dông') || description.includes('sấm')) return <IconCloudStorm {...iconProps} color={theme.palette.warning.dark} />;
    if (description.includes('sét')) return <IconBolt {...iconProps} color={theme.palette.warning.main} />;
    if (description.includes('sương mù') || description.includes('mù')) return <IconCloudFog {...iconProps} color={theme.palette.info.main} />;
    if (description.includes('mưa rào') || description.includes('mưa to')) return <IconCloudRain {...iconProps} color={theme.palette.info.dark} />;
    if (description.includes('mưa')) return <IconCloudRain {...iconProps} color={theme.palette.info.main} />;
    if (description.includes('nắng') || description.includes('quang')) return <IconSun {...iconProps} color="#FF9800" />;
    if (description.includes('mây')) return <IconCloud {...iconProps} color={theme.palette.primary.main} />;
    return <IconCloud {...iconProps} color={theme.palette.primary.main} />;
  };

  return (
    <Box sx={{ 
      flexGrow: 1, 
      display: { xs: 'none', lg: 'flex' }, 
      justifyContent: 'center', 
      alignItems: 'center',
      px: 1,
      minHeight: '40px'
    }}>
      <Tooltip title="Dự báo thời tiết Hà Nội 3 ngày tới (AI)" arrow>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          {forecastLines.map((line, index) => (
            <Stack key={index} direction="row" alignItems="center">
              {getSmallWeatherIcon(line)}
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  lineHeight: 1.1,
                  color: theme.palette.primary.main,
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}
              >
                {line}
              </Typography>
            </Stack>
          ))}
        </Box>
      </Tooltip>
    </Box>
  );
};

export default WeatherSection;
