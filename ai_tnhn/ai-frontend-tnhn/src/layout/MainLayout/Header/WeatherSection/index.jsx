import { useState, useEffect } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Stack, Skeleton, Tooltip, useMediaQuery } from '@mui/material';

// project imports
import weatherApi from 'api/weather';

// assets
import { IconCloud, IconSun, IconCloudRain, IconBolt } from '@tabler/icons-react';

const WeatherSection = () => {
  const theme = useTheme();
  const [forecast, setForecast] = useState('');
  const [loading, setLoading] = useState(true);
  const matchDownMD = useMediaQuery(theme.breakpoints.down('md'));

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
    if (lower.includes('dông') || lower.includes('sét')) return <IconBolt size={20} color={theme.palette.warning.main} />;
    if (lower.includes('mưa')) return <IconCloudRain size={20} color={theme.palette.info.main} />;
    if (lower.includes('nắng')) return <IconSun size={20} color={theme.palette.warning.light} />;
    return <IconCloud size={20} color={theme.palette.primary.main} />;
  };

  if (loading) {
    return (
      <Box sx={{ mr: 2, display: { xs: 'none', md: 'block' } }}>
        <Skeleton variant="text" width={120} height={30} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (!forecast && !loading) return null;

  return (
    <Tooltip title="Dự báo thời tiết 3 ngày tới (Gemini AI)" arrow>
      <Box
        sx={{
          mr: 2,
          display: { xs: 'none', md: 'block' },
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          bgcolor: theme.palette.grey[50],
          border: '1px solid',
          borderColor: theme.palette.divider,
          maxWidth: matchDownMD ? 200 : 400,
          cursor: 'default',
          '&:hover': {
            bgcolor: theme.palette.grey[100]
          }
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          {getWeatherIcon(forecast)}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              color: 'text.secondary',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {forecast}
          </Typography>
        </Stack>
      </Box>
    </Tooltip>
  );
};

export default WeatherSection;
