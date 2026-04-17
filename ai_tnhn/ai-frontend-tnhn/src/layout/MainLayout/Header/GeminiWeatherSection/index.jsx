import { useState, useEffect } from 'react';

// material-ui
import { useTheme, styled } from '@mui/material/styles';
import { Box, Typography, Stack, Skeleton, keyframes } from '@mui/material';

// project imports
import weatherApi from 'api/weather';

// assets
import {
  IconCloud,
  IconSun,
  IconCloudRain,
  IconBolt,
  IconCloudFog,
  IconCloudStorm
} from '@tabler/icons-react';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const ForecastCard = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '8px 12px',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    transform: 'translateY(-2px)'
  }
}));

const VerticalDivider = styled(Box)(({ theme }) => ({
  width: '1px',
  height: '24px',
  background: '#e2e8f0',
  margin: '0 10px',
  flexShrink: 0
}));

const GeminiWeatherSection = () => {
  const theme = useTheme();
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await weatherApi.getGeminiForecast();
        if (res && Array.isArray(res)) {
          setForecast(res);
        } else if (res && res.data && Array.isArray(res.data)) {
          setForecast(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch Gemini weather:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const getWeatherIcon = (text) => {
    const lower = (text || '').toLowerCase();
    const iconProps = { size: 28, style: { animation: `${pulse} 3s ease-in-out infinite` } };

    if (lower.includes('dông') || lower.includes('sấm')) return <IconCloudStorm {...iconProps} color="#FF9800" />;
    if (lower.includes('sét')) return <IconBolt {...iconProps} color="#FFD600" />;
    if (lower.includes('sương mù') || lower.includes('mù')) return <IconCloudFog {...iconProps} color="#90A4AE" />;
    if (lower.includes('mưa rào') || lower.includes('mưa to')) return <IconCloudRain {...iconProps} color="#1976D2" />;
    if (lower.includes('mưa')) return <IconCloudRain {...iconProps} color="#2196F3" />;
    if (lower.includes('nắng') || lower.includes('quang')) return <IconSun {...iconProps} color="#FFA000" />;
    return <IconCloud {...iconProps} color="#2196F3" />;
  };

  if (loading) {
    return (
      <Stack direction="row" spacing={1} sx={{ overflow: 'hidden' }}>
        {[1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" width={220} height={56} sx={{ borderRadius: '16px' }} />
        ))}
      </Stack>
    );
  }

  if (!forecast || forecast.length === 0) return null;

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 1.5, 
      overflowX: 'auto',
      maxWidth: '100vw',
      py: 1,
      px: { xs: 1, md: 0 },
      '&::-webkit-scrollbar': { display: 'none' },
      msOverflowStyle: 'none',
      scrollbarWidth: 'none'
    }}>
      {forecast.slice(0, 3).map((day, index) => (
        <ForecastCard key={index} sx={{ 
          minWidth: { xs: '190px', sm: '210px', md: '230px' },
          flexShrink: 0
        }}>
            {/* Icon Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, flexShrink: 0 }}>
              {getWeatherIcon(day.description)}
            </Box>

            {/* Date Section */}
            <Box sx={{ textAlign: 'center', flexShrink: 0, minWidth: '45px' }}>
              <Typography sx={{ fontSize: '0.75rem', color: '#2196F3', fontWeight: 700, lineHeight: 1, textTransform: 'uppercase' }}>
                Ngày
              </Typography>
              <Typography sx={{ fontSize: '0.95rem', color: '#2d3436', fontWeight: 800, whiteSpace: 'nowrap' }}>
                {day.date}
              </Typography>
            </Box>

            <VerticalDivider />

            {/* Info Section */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: '0.85rem', color: '#636e72', fontWeight: 700, lineHeight: 1.2 }}>
                {day.description}
              </Typography>
              <Typography sx={{ fontSize: '1rem', color: '#2196F3', fontWeight: 800, whiteSpace: 'nowrap' }}>
                {day.temperature_min}-{day.temperature_max}°C
              </Typography>
            </Box>

            {/* Rain Section */}
            <Box sx={{ ml: 1, flexShrink: 0, textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.85rem', color: '#636e72', fontWeight: 600, lineHeight: 1.1 }}>
                Mưa: <Box component="span" sx={{ color: '#2196F3', fontWeight: 800 }}>{day.rain_probability}%</Box>
                {day.rain_fall > 0 && (
                  <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', color: '#2196F3', fontWeight: 700 }}>
                    ({day.rain_fall}mm)
                  </Box>
                )}
              </Typography>
            </Box>
        </ForecastCard>
      ))}
    </Box>
  );
};

export default GeminiWeatherSection;
