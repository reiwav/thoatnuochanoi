import React from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import { useTheme, styled } from '@mui/material/styles';
import { Button, Card, CardContent, Grid, Typography, Box, Stack } from '@mui/material';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import { gridSpacing } from 'store/constant';

// assets
import { IconTool, IconArrowLeft, IconRocket } from '@tabler/icons-react';

// styles
const CardWrapper = styled(Card)(({ theme }) => ({
    background: theme.palette.mode === 'dark' ? theme.palette.dark.main : theme.palette.primary.light,
    color: theme.palette.primary.dark,
    overflow: 'hidden',
    position: 'relative',
    '&:after': {
        content: '""',
        position: 'absolute',
        width: 210,
        height: 210,
        background: `linear-gradient(210.04deg, ${theme.palette.primary[200]} -50.94%, rgba(144, 202, 249, 0) 83.49%)`,
        borderRadius: '50%',
        top: -30,
        right: -180
    },
    '&:before': {
        content: '""',
        position: 'absolute',
        width: 210,
        height: 210,
        background: `linear-gradient(140.9deg, ${theme.palette.primary[200]} -14.02%, rgba(144, 202, 249, 0) 70.50%)`,
        borderRadius: '50%',
        top: -160,
        right: -130
    }
}));

// ==============================|| UNDER DEVELOPMENT PAGE ||============================== //

const UnderDevelopment = () => {
    const theme = useTheme();
    const navigate = useNavigate();

    return (
        <Grid container spacing={gridSpacing} justifyContent="center" alignItems="center" sx={{ minHeight: 'calc(100vh - 200px)' }}>
            <Grid item xs={12} sm={10} md={8} lg={6}>
                <CardWrapper>
                    <CardContent sx={{ p: 5 }}>
                        <Stack spacing={4} alignItems="center" textAlign="center">
                            <Box
                                sx={{
                                    width: 120,
                                    height: 120,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: theme.customShadows.primary,
                                    animation: 'pulse 2s infinite ease-in-out',
                                    '@keyframes pulse': {
                                        '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(33, 150, 243, 0.7)' },
                                        '70%': { transform: 'scale(1)', boxShadow: '0 0 0 20px rgba(33, 150, 243, 0)' },
                                        '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(33, 150, 243, 0)' }
                                    }
                                }}
                            >
                                <IconRocket size={64} color="white" stroke={1.5} />
                            </Box>
                            
                            <Stack spacing={2}>
                                <Typography variant="h1" sx={{ fontWeight: 900, color: 'primary.800', fontSize: { xs: '2rem', md: '3rem' } }}>
                                    Đang Phát Triển
                                </Typography>
                                <Typography variant="h4" color="textSecondary" sx={{ fontWeight: 500, maxWidth: 500, mx: 'auto' }}>
                                    Tính năng này hiện đang trong quá trình hoàn thiện để mang lại trải nghiệm tốt nhất cho bạn. Vui lòng quay lại sau!
                                </Typography>
                            </Stack>

                            <Box sx={{ mt: 2 }}>
                                <AnimateButton>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={<IconArrowLeft size={20} />}
                                        onClick={() => navigate(-1)}
                                        sx={{
                                            borderRadius: 2,
                                            px: 4,
                                            py: 1.5,
                                            fontWeight: 700,
                                            fontSize: '1rem',
                                            boxShadow: theme.customShadows.primary
                                        }}
                                    >
                                        Quay lại
                                    </Button>
                                </AnimateButton>
                            </Box>
                        </Stack>
                    </CardContent>
                </CardWrapper>
            </Grid>
        </Grid>
    );
};

export default UnderDevelopment;
