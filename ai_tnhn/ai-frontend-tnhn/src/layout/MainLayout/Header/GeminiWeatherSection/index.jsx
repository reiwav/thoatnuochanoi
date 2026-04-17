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
  padding: '8px 16px',
  borderRadius: '16px',
  border: '1px solid #e0e0e0',
  background: '#ffffff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  minWidth: '240px',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transform: 'translateY(-2px)'
  }
}));

const VerticalDivider = styled(Box)(({ theme }) => ({
  width: '1px',
  height: '24px',
  background: '#e0e0e0',
  margin: '0 12px'
}));

const GeminiWeatherSection = () => {
  const theme = useTheme();
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await weatherApi.getGeminiForecast();
        console.log('Gemini Forecast Response:', res);
        // axiosClient interceptor already returns res.data.data
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
      <Stack direction="row" spacing={2} sx={{ display: 'flex' }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" width={240} height={56} sx={{ borderRadius: '16px' }} />
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
      maxWidth: '100%',
      py: 1,
      '&::-webkit-scrollbar': { display: 'none' }, // Hide scrollbar for a clean header Look
      msOverflowStyle: 'none',
      scrollbarWidth: 'none'
    }}>
      {forecast.slice(0, 3).map((day, index) => (
        <ForecastCard key={index} sx={{ 
          minWidth: { md: '200px', lg: '240px' },
          px: { md: 1, lg: 2 }
        }}>
          {/* Icon Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
            {getWeatherIcon(day.description)}
          </Box>

          {/* Date Section */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.85rem', color: '#2196F3', fontWeight: 700, lineHeight: 1 }}>
              Ngày
            </Typography>
            <Typography sx={{ fontSize: '1rem', color: '#2d3436', fontWeight: 800 }}>
              {day.date}
            </Typography>
          </Box>

          <VerticalDivider />

          {/* Info Section */}
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontSize: '0.9rem', color: '#636e72', fontWeight: 700, lineHeight: 1.2 }}>
              {day.description}
            </Typography>
            <Typography sx={{ fontSize: '1.1rem', color: '#2196F3', fontWeight: 800 }}>
              {day.temperature_min}-{day.temperature_max}°C
            </Typography>
          </Box>

          {/* Rain Section */}
          <Box sx={{ ml: 1, minWidth: '90px', textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.95rem', color: '#636e72', fontWeight: 600 }}>
              Mưa: <Box component="span" sx={{ color: '#2196F3', fontWeight: 800, fontSize: '1.1rem' }}>{day.rain_probability}%</Box>
              {day.rain_fall > 0 && (
                <Box component="span" sx={{ display: 'block', fontSize: '0.85rem', color: '#2196F3', fontWeight: 700 }}>
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
