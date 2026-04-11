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
    const iconProps = { size: 20, style: { marginRight: '8px' } };

    if (description.includes('dông') || description.includes('sấm')) return <IconCloudStorm {...iconProps} color={theme.palette.warning.dark} />;
    if (description.includes('sét')) return <IconBolt {...iconProps} color={theme.palette.warning.main} />;
    if (description.includes('sương mù') || description.includes('mù')) return <IconCloudFog {...iconProps} color={theme.palette.info.main} />;
    if (description.includes('mưa rào') || description.includes('mưa to')) return <IconCloudRain {...iconProps} color={theme.palette.info.dark} />;
    if (description.includes('mưa')) return <IconCloudRain {...iconProps} color={theme.palette.info.main} />;
    if (description.includes('nắng') || description.includes('quang')) return <IconSun {...iconProps} color="#FF9800" />;
    if (description.includes('mây')) return <IconCloud {...iconProps} color={theme.palette.primary.main} />;
    return <IconCloud {...iconProps} color={theme.palette.primary.main} />;
  };

  const parseForecastLine = (line) => {
    // Ví dụ line: "- Ngày 11/04: Sương mù; Tỉ lệ mưa: 0%; Nhiệt độ: 24.4-36.3°C"

    // 1. Làm sạch dấu gạch đầu dòng và khoảng trắng thừa
    const cleanLine = line.trim().replace(/^-?\s*/, '');

    // 2. Tách Ngày và phần còn lại
    const firstColonIndex = cleanLine.indexOf(':');
    if (firstColonIndex === -1) return { day: '', desc: cleanLine, temp: '', rain: '' };

    const day = cleanLine.substring(0, firstColonIndex).replace(/Ngày\s*/i, '').trim();
    const rest = cleanLine.substring(firstColonIndex + 1).trim();

    // 3. Tách các thành phần bằng dấu ";"
    const details = rest.split(';').map(item => item.trim());

    let desc = details[0] || ''; // "Sương mù"
    let rain = '';
    let temp = '';

    details.forEach(detail => {
      if (detail.includes('Tỉ lệ mưa')) {
        // Lấy phần sau dấu ":" của "Tỉ lệ mưa: 0%"
        rain = detail.split(':')[1]?.trim() || '';
      } else if (detail.includes('Nhiệt độ')) {
        // Lấy phần sau dấu ":" của "Nhiệt độ: 24.4-36.3°C"
        temp = detail.split(':')[1]?.trim() || '';
      }
    });

    return { day, desc, temp, rain };
  };
  const parsedForecast = forecastLines.map(parseForecastLine);

  return (
    <Box sx={{
      flexGrow: 1,
      display: { xs: 'none', lg: 'flex' },
      justifyContent: 'center',
      alignItems: 'center',
      px: 1,
      minHeight: '48px'
    }}>
      <Tooltip
        title={
          <Box sx={{ 
            p: 1.5, 
            minWidth: '220px',
            background: theme.palette.mode === 'dark' ? 'rgba(17, 25, 41, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: theme.palette.divider,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <Typography variant="subtitle2" sx={{ 
              mb: 1.5, 
              fontWeight: 800, 
              color: theme.palette.primary.main,
              borderBottom: '1px solid',
              borderColor: 'divider',
              pb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <IconCloud size={18} />
              Dự báo thời tiết Hà Nội
            </Typography>
            <Stack spacing={1.5}>
              {parsedForecast.map((item, idx) => (
                <Box key={idx} sx={{ 
                  pb: idx === parsedForecast.length - 1 ? 0 : 1,
                  borderBottom: idx === parsedForecast.length - 1 ? 'none' : '1px dashed',
                  borderColor: 'divider'
                }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.text.primary, display: 'block', mb: 0.5 }}>
                    Ngày {item.day}
                  </Typography>
                  <Box sx={{ pl: 1 }}>
                    <Typography variant="caption" display="block" sx={{ color: theme.palette.text.secondary }}>
                      • <b>{item.desc}</b>
                    </Typography>
                    {item.temp && (
                      <Typography variant="caption" display="block" sx={{ color: theme.palette.warning.dark }}>
                        • Nhiệt độ: {item.temp}
                      </Typography>
                    )}
                    {item.rain && (
                      <Typography variant="caption" display="block" sx={{ color: theme.palette.info.main }}>
                        • Tỷ lệ mưa: {item.rain}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        }
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: 'transparent',
              '& .MuiTooltip-arrow': {
                color: theme.palette.mode === 'dark' ? 'rgba(17, 25, 41, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              }
            }
          }
        }}
        arrow
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {parsedForecast.map((item, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 0.75,
                borderRadius: '10px',
                minWidth: '200px',
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 4px 20px rgba(0,0,0,0.4)'
                  : '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid',
                borderColor: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-3px) scale(1.02)',
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.12)'
                    : '#fff',
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 8px 25px ${theme.palette.primary.light}40`
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getSmallWeatherIcon(item.desc)}
              </Box>

              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid', borderColor: 'divider', pr: 1.5 }}>
                  <Typography
                    sx={{
                      fontWeight: 850,
                      fontSize: '0.85rem',
                      color: theme.palette.primary.main,
                      lineHeight: 1
                    }}
                  >
                    Ngày
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      color: theme.palette.text.primary,
                      lineHeight: 1.2
                    }}
                  >
                    {item.day}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: theme.palette.text.primary,
                        lineHeight: 1.1,
                        whiteSpace: 'nowrap',
                        mb: 0.5
                      }}
                    >
                      {item.desc}
                    </Typography>
                    <Stack direction="row" spacing={1.5}>
                      {item.temp && (
                        <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: theme.palette.text.secondary }}>
                          <Box component="span" sx={{ color: theme.palette.info.main }}>{item.temp}</Box>
                        </Typography>
                      )}
                      {item.rain && (
                        <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: theme.palette.text.secondary }}>
                          Mưa: <Box component="span" sx={{ color: theme.palette.info.main }}>{item.rain.replace(/Tỉ lệ mưa /i, '').trim()}</Box>
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Tooltip>
    </Box>
  );
};

export default WeatherSection;
