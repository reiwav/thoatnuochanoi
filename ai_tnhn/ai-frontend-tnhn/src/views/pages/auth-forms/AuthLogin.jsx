import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import CustomFormControl from 'ui-component/extended/Form/CustomFormControl';
import authApi from 'api/auth';
import { ADMIN_TOKEN } from 'constants/auth';
import useAuthStore from 'store/useAuthStore';
import * as ROLES from 'constants/role';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function AuthLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: storeLogin } = useAuthStore();

  // --- 1. Quản lý State ---
  const [values, setValues] = useState({
    email: '',
    password: ''
  });
  const [checked, setChecked] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(''); // Lưu thông báo lỗi API

  // --- 1.5. Check token and metadata from Google OAuth ---
  useEffect(() => {
    const token = searchParams.get('token');
    const role = searchParams.get('role');
    const name = searchParams.get('name');
    const isEmployeeVal = searchParams.get('is_employee') === 'true';
    const isCompanyVal = searchParams.get('is_company') === 'true';

    if (token) {
      // Store metadata via Zustand
      let userRole = role || 'employee';
      if (userRole === 'supper_admin' || userRole === 'super_admib' || userRole === 'super_admin ') {
        userRole = ROLES.ROLE_SUPER_ADMIN;
      }
      
      storeLogin({ name, email: searchParams.get('email') }, token, userRole, isEmployeeVal, isCompanyVal);
      
      // Immediate redirection based on is_employee flag
      if (isEmployeeVal) {
        navigate('/company/inundation', { replace: true });
      } else if (userRole === 'manager_contract') {
        navigate('/admin/ai-contract', { replace: true });
      } else if (userRole === 'reviewer') {
        navigate('/admin/inundation-list', { replace: true });
      } else {
        navigate('/admin/ai-support', { replace: true });
      }
    }
  }, [searchParams, navigate, storeLogin]);

  // --- 2. Xử lý sự kiện ---
  const handleChange = (event) => {
    setValues({
      ...values,
      [event.target.name]: event.target.value
    });
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleMouseDownPassword = (event) => event.preventDefault();

  const handleSubmit = async (event) => {
    event.preventDefault(); // Ngăn load lại trang
    setError('');

    try {
      // Gọi API thực tế
      const response = await authApi.login(values);
      console.log(response);
      const result = response.data;

        // 2. Kiểm tra status từ server trả về
      if (result.status === 'success') {
        const tokenData = result.data;
        
        let role = tokenData.role || ROLES.ROLE_EMPLOYEE;
        if (role === 'supper_admin' || role === 'super_admib' || role === 'super_admin ') {
          role = ROLES.ROLE_SUPER_ADMIN;
        }

        const isEmployee = !!tokenData.is_employee;
        const isCompany = !!tokenData.is_company;

        // Store via Zustand
        storeLogin({ name: tokenData.name, email: values.email }, tokenData.id, role, isEmployee, isCompany);

        // Redirect based on isEmployee
        if (isEmployee) {
          navigate('/company/inundation');
        } else if (role === 'manager_contract') {
          navigate('/admin/ai-contract');
        } else if (role === 'reviewer') {
          navigate('/admin/inundation-list');
        } else {
          navigate('/admin/ai-support');
        }
      } else {
        // Trường hợp code 200 nhưng status không phải success (nếu backend thiết kế vậy)
        setError(result.message || 'Đăng nhập không thành công');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Email hoặc mật khẩu không đúng');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Hiển thị lỗi nếu có */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <CustomFormControl fullWidth>
        <InputLabel htmlFor="outlined-adornment-email-login">Email Address / Username</InputLabel>
        <OutlinedInput
          id="outlined-adornment-email-login"
          type="email"
          name="email"
          value={values.email} // Gán giá trị từ state
          onChange={handleChange} // Cập nhật state khi gõ
          label="Email Address / Username"
        />
      </CustomFormControl>

      <CustomFormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel htmlFor="outlined-adornment-password-login">Password</InputLabel>
        <OutlinedInput
          id="outlined-adornment-password-login"
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={values.password} // Gán giá trị từ state
          onChange={handleChange} // Cập nhật state khi gõ
          endAdornment={
            <InputAdornment position="end">
              <IconButton onClick={handleClickShowPassword} onMouseDown={handleMouseDownPassword} edge="end" size="large">
                {showPassword ? <Visibility /> : <VisibilityOff />}
              </IconButton>
            </InputAdornment>
          }
          label="Password"
        />
      </CustomFormControl>

      <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
        <Grid>
          <FormControlLabel
            control={<Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} name="checked" color="primary" />}
            label="Keep me logged in"
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 2 }}>
        <AnimateButton>
          <Button
            color="secondary"
            fullWidth
            size="large"
            type="submit" // Sử dụng type="submit" để kích hoạt onSubmit của form
            variant="contained"
          >
            Sign In
          </Button>
        </AnimateButton>
      </Box>

      {/* <Divider sx={{ my: 2 }}>OR</Divider> */}

      {/* <Box sx={{ mt: 2 }}>
        <AnimateButton>
          <Button
            fullWidth
            size="large"
            variant="outlined"
            onClick={() => {
              window.location.href = `${import.meta.env.VITE_APP_API_URL}/api/auth/google/login`;
            }}
            startIcon={<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="google" width={18} height={18} />}
          >
            Đăng nhập bằng Google
          </Button>
        </AnimateButton>
      </Box> */}
    </form>
  );
}