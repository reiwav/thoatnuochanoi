import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Badge from '@mui/material/Badge';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import DashboardIcon from '@mui/icons-material/Dashboard';
import WarningIcon from '@mui/icons-material/Warning';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import EngineeringIcon from '@mui/icons-material/Engineering';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import Footer from './Footer';
import Header from './Header';
import Sidebar from './Sidebar';
import MainContentStyled from './MainContentStyled';
import Customization from '../Customization';
import Loader from 'ui-component/Loader';
import Breadcrumbs from 'ui-component/extended/Breadcrumbs';

import useConfig from 'hooks/useConfig';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import authApi from 'api/auth';
import { ADMIN_TOKEN } from 'constants/auth';
import inundationApi from 'api/inundation';

export default function MainLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const downSM = useMediaQuery(theme.breakpoints.down('sm'));
  const { pathname } = useLocation();

  const [isChecking, setIsChecking] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [activeFloodCount, setActiveFloodCount] = useState(0);

  const { state: { borderRadius, miniDrawer } } = useConfig();
  const { menuMaster, menuMasterLoading } = useGetMenuMaster();
  const drawerOpen = menuMaster?.isDashboardDrawerOpened;

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const urlToken = searchParams.get('token');
      if (urlToken) {
        localStorage.setItem(ADMIN_TOKEN, urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      const token = localStorage.getItem(ADMIN_TOKEN);
      if (!token) { navigate('/pages/login', { replace: true }); return; }
      try {
        const response = await authApi.getProfile();
        const result = response.data;
        if (result.status === 'success') {
          const user = result.data;
          setUserInfo(user);
          if (user.role) localStorage.setItem('role', user.role);
          setIsChecking(false);
        } else {
          localStorage.removeItem(ADMIN_TOKEN);
          navigate('/pages/login', { replace: true });
        }
      } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem(ADMIN_TOKEN);
        navigate('/pages/login', { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  // Role-based redirection
  useEffect(() => {
    if (isChecking || !userInfo) return;

    const role = userInfo.role || localStorage.getItem('role') || 'employee';
    const isEmployee = role === 'employee';
    const basePath = isEmployee ? '/company' : '/admin';

    // If at root, redirect to respective dashboard
    if (pathname === '/') {
      navigate(`${basePath}/inundation`, { replace: true });
      return;
    }

    // Redirect if on the wrong path prefix
    if (isEmployee && pathname.startsWith('/admin')) {
      const newPath = pathname.replace('/admin', '/company');
      navigate(newPath, { replace: true });
    } else if (!isEmployee && pathname.startsWith('/company')) {
      const newPath = pathname.replace('/company', '/admin');
      navigate(newPath, { replace: true });
    }
  }, [isChecking, userInfo, pathname, navigate]);

  const userRole = userInfo?.role || localStorage.getItem('role') || 'employee';
  const basePath = userRole === 'employee' ? '/company' : '/admin';

  const isEmployee = userRole === 'employee';

  // Fetch active flood count for badge
  useEffect(() => {
    if (!isEmployee) return;
    const fetchCount = async () => {
      try {
        const res = await inundationApi.listReports();
        if (res.data?.status === 'success') {
          const active = (res.data.data || []).filter(r => r.status !== 'resolved').length;
          setActiveFloodCount(active);
        }
      } catch { /* silent */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [isEmployee]);

  const isConstructionPath = pathname.includes('/emergency-construction');
  const isInundationPath = pathname === '/' || pathname.startsWith('/admin/inundation') || pathname.startsWith('/company/inundation');
  const isAiSupportPath = pathname === '/admin/ai-support';
  const showMobileAppLayout = isEmployee && (isInundationPath || isConstructionPath);

  // Auto-collapse sidebar on AI Support page (only for mobile)
  useEffect(() => {
    if (isAiSupportPath && downSM) {
      handlerDrawerOpen(false);
    }
  }, [isAiSupportPath, downSM]);

  // Always open sidebar on desktop/tablet
  useEffect(() => {
    if (!downSM && !drawerOpen) {
      handlerDrawerOpen(true);
    }
  }, [drawerOpen, downSM]);

  const handleTopTabChange = (event, newValue) => {
    if (newValue === 0) {
      navigate(`${basePath}/inundation`);
    } else {
      navigate(`${basePath}/emergency-construction/dashboard`);
    }
  };
  // Determine which bottom nav tab is active
  const getBottomNavValue = () => {
    if (pathname === '/admin/inundation/form') return -1; // "Báo mới" sub-page — highlight nothing or form
    if (pathname.startsWith('/admin/inundation')) return 0;
    return 0;
  };

  // Map bottom nav route from query param ?tab or pathname
  const getMobileNavValue = () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (pathname === `${basePath}/inundation/form`) return tab === '1' ? 1 : 3; // 3 = "Tạo mới"
    return 0; // dashboard
  };

  if (menuMasterLoading || isChecking) return <Loader />;

  return (
    <Box sx={{ display: 'flex' }}>
      {!showMobileAppLayout && (
        <AppBar enableColorOnDark position="fixed" color="inherit" elevation={0} sx={{ bgcolor: 'background.default' }}>
          <Toolbar sx={{ p: 2 }}>
            <Header userInfo={userInfo} userRole={userRole} />
          </Toolbar>
        </AppBar>
      )}

      {!showMobileAppLayout && <Sidebar />}

      {showMobileAppLayout ? (
        <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', pb: 8, pt: 6 }}>
          {/* Global Top Tabs for Mobile Layout */}
          <Paper
            sx={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200,
              borderRadius: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              bgcolor: 'background.paper'
            }}
            elevation={0}
          >
            <Tabs
              value={isConstructionPath ? 1 : 0}
              onChange={handleTopTabChange}
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Trực ngập lụt" sx={{ fontWeight: 700, fontSize: '0.95rem' }} />
              <Tab label="Công trình khẩn" sx={{ fontWeight: 700, fontSize: '0.95rem' }} />
            </Tabs>
          </Paper>

          <Outlet />

          {/* Persistent Mobile Bottom Navigation */}
          <Paper
            sx={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
              borderRadius: '16px 16px 0 0', overflow: 'hidden',
              boxShadow: '0 -2px 12px rgba(0,0,0,0.08)'
            }}
            elevation={0}
          >
            {isConstructionPath ? (
              <BottomNavigation
                showLabels
                value={(() => {
                  const p = new URLSearchParams(window.location.search);
                  const activeTab = p.get('activeTab');
                  if (pathname.includes('/form')) return -1; // hide indicator in form
                  if (activeTab === '1') return 1;
                  if (activeTab === '2') return 2;
                  if (activeTab === '3') return 3;
                  return 0; // dashboard
                })()}
                onChange={(_, val) => {
                  if (val === 0) navigate(`${basePath}/emergency-construction/dashboard`);
                  else if (val === 1) navigate(`${basePath}/emergency-construction/dashboard?activeTab=1`);
                  else if (val === 2) navigate(`${basePath}/emergency-construction/dashboard?activeTab=2`);
                  else if (val === 3) navigate(`${basePath}/emergency-construction/dashboard?activeTab=3`);
                }}
                sx={{
                  height: 72,
                  '& .MuiBottomNavigationAction-root': { py: 1 },
                  '& .MuiBottomNavigationAction-label': { fontWeight: 700, fontSize: '0.85rem', mt: 0.3 }
                }}
              >
                <BottomNavigationAction label="Tổng quan" icon={<DashboardIcon sx={{ fontSize: '1.6rem' }} />} />
                <BottomNavigationAction label="Chưa xong" icon={<EngineeringIcon sx={{ fontSize: '1.6rem' }} />} />
                <BottomNavigationAction label="Lịch sử" icon={<HistoryIcon sx={{ fontSize: '1.6rem' }} />} />
                <BottomNavigationAction label="Tài khoản" icon={<PersonIcon sx={{ fontSize: '1.6rem' }} />} />
              </BottomNavigation>
            ) : (
              <BottomNavigation
                showLabels
                value={(() => {
                  if (pathname === `${basePath}/inundation/form`) {
                    const p = new URLSearchParams(window.location.search);
                    return p.get('tab') === '1' ? 1 : -1;
                  }
                  const p = new URLSearchParams(window.location.search);
                  const activeTab = p.get('activeTab');
                  if (activeTab === '1') return 1;
                  if (activeTab === '2') return 2;
                  if (activeTab === '3') return 3;
                  return 0;
                })()}
                onChange={(_, val) => {
                  if (val === 0) navigate(`${basePath}/inundation`);
                  else if (val === 1) navigate(`${basePath}/inundation?activeTab=1`);
                  else if (val === 2) navigate(`${basePath}/inundation?activeTab=2`);
                  else if (val === 3) navigate(`${basePath}/inundation?activeTab=3`);
                }}
                sx={{
                  height: 72,
                  '& .MuiBottomNavigationAction-root': { py: 1 },
                  '& .MuiBottomNavigationAction-label': { fontWeight: 700, fontSize: '0.85rem', mt: 0.3 }
                }}
              >
                <BottomNavigationAction label="Tổng quan" icon={<DashboardIcon sx={{ fontSize: '1.6rem' }} />} />
                <BottomNavigationAction
                  label="Đang ngập"
                  icon={
                    <Badge badgeContent={activeFloodCount} color="error" max={99}>
                      <WarningIcon sx={{ fontSize: '1.6rem' }} />
                    </Badge>
                  }
                />
                <BottomNavigationAction label="Lịch sử" icon={<HistoryIcon sx={{ fontSize: '1.6rem' }} />} />
                <BottomNavigationAction label="Tài khoản" icon={<PersonIcon sx={{ fontSize: '1.6rem' }} />} />
              </BottomNavigation>
            )}
          </Paper>
        </Box>
      ) : (
        <MainContentStyled {...{ borderRadius, open: drawerOpen }}>
          <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: 'calc(100vh - 128px)', display: 'flex', flexDirection: 'column' }}>
            <Breadcrumbs />
            <Outlet />
            <Footer />
          </Box>
        </MainContentStyled>
      )}
      {!showMobileAppLayout && <Customization />}
    </Box>
  );
}