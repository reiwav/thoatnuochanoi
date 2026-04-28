import { Link } from 'react-router-dom';

import useMediaQuery from '@mui/material/useMediaQuery';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import AuthWrapper1 from './AuthWrapper1';
import AuthCardWrapper from './AuthCardWrapper';

import Logo from 'ui-component/Logo';
import AuthFooter from 'ui-component/cards/AuthFooter';
import AuthLogin from '../auth-forms/AuthLogin';

// ================================|| AUTH3 - LOGIN ||================================ //

export default function Login() {
  const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));

  return (
    <AuthWrapper1>
      <Stack sx={{ justifyContent: 'flex-end', minHeight: '100vh' }}>
        <Stack sx={{ justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 68px)' }}>
          <Box sx={{ m: { xs: 1, sm: 3 }, mb: 0 }}>
            <AuthCardWrapper>
              <Stack sx={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <Box sx={{ mb: 3 }}>
                  <Link to="#" aria-label="logo">
                    <Logo />
                  </Link>
                </Box>
                <Stack sx={{ alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography variant={downMD ? 'h1' : 'h2'} sx={{ color: 'secondary.main', textAlign: 'center' }}>
                    Thoát nước Hà Nội
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: downMD ? '20px' : '16px', textAlign: { xs: 'center', md: 'inherit' } }}>
                    Hệ thống tích hợp AI (Thử nghiệm)
                  </Typography>
                </Stack>
                <Box sx={{ width: 1 }}>
                  <AuthLogin />
                </Box>
                <Box
                  sx={{
                    width: 1,
                    bgcolor: '#fff3cd',
                    border: '2px solid #ff6b00',
                    borderRadius: 2,
                    px: 2,
                    py: 1.5,
                    textAlign: 'center',
                    '@keyframes blink': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    },
                    animation: 'blink 2s ease-in-out infinite',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#cc0000', fontWeight: 900, fontSize: '0.85rem', lineHeight: 1.5 }}>
                    ⚠️ Hệ thống đang <Box component="span" sx={{ textDecoration: 'underline' }}>SỬA CHỮA, CẬP NHẬT</Box>
                    <br />
                    Khi sử dụng sẽ có thể có sự cố!
                  </Typography>
                </Box>
                <Divider sx={{ width: 1 }} />
                {/* <Stack sx={{ alignItems: 'center' }}>
                  <Typography component={Link} to="/pages/register" variant="subtitle1" sx={{ textDecoration: 'none' }}>
                    Don&apos;t have an account?
                  </Typography>
                </Stack> */}
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
