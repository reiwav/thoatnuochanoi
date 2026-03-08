import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import CustomFormControl from 'ui-component/extended/Form/CustomFormControl';
import authEmployeeApi from 'api/authEmployee';
import { ADMIN_TOKEN } from 'constants/auth';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function AuthEmployeeLogin() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [values, setValues] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    // --- Check token from Google (Employee) ---
    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            localStorage.setItem(ADMIN_TOKEN, token);
            localStorage.setItem('role', 'employee');
            navigate('/company/inundation', { replace: true });
        }
    }, [searchParams, navigate]);

    const handleChange = (event) => {
        setValues({
            ...values,
            [event.target.name]: event.target.value
        });
    };

    const handleClickShowPassword = () => setShowPassword(!showPassword);
    const handleMouseDownPassword = (event) => event.preventDefault();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        try {
            const response = await authEmployeeApi.login(values);
            const result = response.data;

            if (result.status === 'success') {
                localStorage.setItem(ADMIN_TOKEN, result.data);
                // Employees always go to /company
                localStorage.setItem('role', 'employee');
                navigate('/company/inundation');
            } else {
                setError(result.error || 'Đăng nhập không thành công');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Email hoặc mật khẩu không đúng');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <CustomFormControl fullWidth>
                <InputLabel htmlFor="outlined-adornment-email-login">Email / Username Nhân viên</InputLabel>
                <OutlinedInput
                    id="outlined-adornment-email-login"
                    type="email"
                    name="email"
                    value={values.email}
                    onChange={handleChange}
                    label="Email / Username Nhân viên"
                />
            </CustomFormControl>

            <CustomFormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel htmlFor="outlined-adornment-password-login">Mật khẩu</InputLabel>
                <OutlinedInput
                    id="outlined-adornment-password-login"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={values.password}
                    onChange={handleChange}
                    endAdornment={
                        <InputAdornment position="end">
                            <IconButton onClick={handleClickShowPassword} onMouseDown={handleMouseDownPassword} edge="end" size="large">
                                {showPassword ? <Visibility /> : <VisibilityOff />}
                            </IconButton>
                        </InputAdornment>
                    }
                    label="Mật khẩu"
                />
            </CustomFormControl>

            <Box sx={{ mt: 3 }}>
                <AnimateButton>
                    <Button
                        color="primary"
                        fullWidth
                        size="large"
                        type="submit"
                        variant="contained"
                        sx={{ borderRadius: '12px' }}
                    >
                        Đăng nhập Check-in
                    </Button>
                </AnimateButton>
            </Box>

            <Box sx={{ mt: 2 }}>
                <AnimateButton>
                    <Button
                        fullWidth
                        size="large"
                        variant="outlined"
                        sx={{ borderRadius: '12px' }}
                        onClick={() => {
                            window.location.href = `${import.meta.env.VITE_APP_API_URL}/api/auth/google/login`;
                        }}
                        startIcon={<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="google" width={18} height={18} />}
                    >
                        Đăng nhập bằng Google
                    </Button>
                </AnimateButton>
            </Box>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">
                    Dành riêng cho nhân viên thực hiện check-in tại sự kiện
                </Typography>
            </Box>
        </form>
    );
}
