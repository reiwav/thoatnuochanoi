import useMediaQuery from '@mui/material/useMediaQuery';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import AuthWrapper1 from './AuthWrapper1';
import AuthCardWrapper from './AuthCardWrapper';
import Logo from 'ui-component/Logo';
import AuthFooter from 'ui-component/cards/AuthFooter';
import AuthEmployeeLogin from '../auth-forms/AuthEmployeeLogin';

// ================================|| EMPLOYEE LOGIN ||================================ //

export default function EmployeeLogin() {
    const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));

    return (
        <AuthWrapper1>
            <Stack sx={{ justifyContent: 'flex-end', minHeight: '100vh', bgcolor: '#f4f7fb' }}>
                <Stack sx={{ justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 68px)' }}>
                    <Box sx={{ m: { xs: 1, sm: 3 }, mb: 0 }}>
                        <AuthCardWrapper>
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                <Box sx={{ mb: 1 }}>
                                    <Logo />
                                </Box>
                                <Stack sx={{ alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                    <Typography variant={downMD ? 'h2' : 'h1'} sx={{ color: 'primary.main', fontWeight: 700 }}>
                                        Hệ thống Check-in
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center', fontSize: { xs: '1rem', md: '1.125rem' } }}>
                                        Vui lòng đăng nhập để thực hiện nhiệm vụ
                                    </Typography>
                                </Stack>
                                <Box sx={{ width: 1, mt: 2 }}>
                                    <AuthEmployeeLogin />
                                </Box>
                            </Stack>
                        </AuthCardWrapper>
                    </Box>
                </Stack>
                <Box sx={{ px: 3, my: 3 }}>
                    <AuthFooter />
                </Box>
            </Stack>
        </AuthWrapper1>
    );
}
