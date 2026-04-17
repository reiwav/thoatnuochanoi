import { useEffect, useState, useMemo } from 'react';
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
import FloatingChat from './FloatingChat';
import Loader from 'ui-component/Loader';
import Breadcrumbs from 'ui-component/extended/Breadcrumbs';

import useConfig from 'hooks/useConfig';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import authApi from 'api/auth';
import { ADMIN_TOKEN } from 'constants/auth';
import inundationApi from 'api/inundation';
import useAuthStore from 'store/useAuthStore';
import menuItems from 'menu-items';

export default function MainLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const downSM = useMediaQuery(theme.breakpoints.down('sm'));
  const { pathname } = useLocation();

  const [isChecking, setIsChecking] = useState(true);
  const [activeFloodCount, setActiveFloodCount] = useState(0);

  const { state: { borderRadius } } = useConfig();
  const { menuMaster, menuMasterLoading } = useGetMenuMaster();
  const drawerOpen = menuMaster?.isDashboardDrawerOpened;

  const { isEmployee, isCompany, role: userRole, user: userInfo, login: storeLogin, logout: storeLogout, hasPermission, permissionsLoaded } = useAuthStore();

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const urlToken = searchParams.get('token');
      const storeState = useAuthStore.getState();
      const currentToken = urlToken || storeState.token || localStorage.getItem(ADMIN_TOKEN);

      if (!currentToken) {
        navigate('/pages/login', { replace: true });
        return;
      }

      try {
        if (urlToken) {
          localStorage.setItem(ADMIN_TOKEN, urlToken);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const user = await authApi.getProfile();
        // Since it's flattened, a successful call means user is the profile object
        if (user && user.id) {
          storeLogin(user, currentToken, user.role, user.is_employee, user.is_company);
          setIsChecking(false);
        } else {
          storeLogout();
          navigate('/pages/login', { replace: true });
        }
      } catch (error) {
        console.error('Auth error:', error);
        storeLogout();
        navigate('/pages/login', { replace: true });
      }
    };
    checkAuth();
  }, [navigate, searchParams, storeLogin, storeLogout]);

  const basePath = isEmployee ? '/company' : '/admin';
  const isConstructionPath = pathname.includes('/emergency-construction');
  const isInundationPath = pathname === '/' || pathname.startsWith('/admin/inundation') || pathname.startsWith('/company/inundation');
  const isPumpingPath = pathname.includes('/tram-bom');
  const isAiSupportPath = pathname === '/admin/ai-support';

  const availableTabs = useMemo(() => {
    if (!userInfo) return [];

    const tabs = [
      {
        id: 'inundation',
        label: 'Điểm ngập',
        path: `${basePath}/inundation`,
        active: isInundationPath,
        show: !isEmployee || (userInfo?.assigned_inundation_station_ids?.filter(id => id && id.trim() !== "").length > 0)
      },
      {
        id: 'pumping',
        label: 'Trạm bơm',
        path: `${basePath}/tram-bom`,
        active: isPumpingPath,
        show: !isEmployee || (userInfo?.assigned_pumping_station_id && userInfo.assigned_pumping_station_id.trim() !== "")
      },
      {
        id: 'construction',
        label: 'Công trình khẩn',
        path: `${basePath}/emergency-construction/dashboard`,
        active: isConstructionPath,
        show: !isEmployee || (userInfo?.assigned_emergency_construction_ids?.filter(id => id && id.trim() !== "").length > 0)
      }
    ];

    return tabs.filter(tab => tab.show);
  }, [userInfo, isEmployee, basePath, isInundationPath, isPumpingPath, isConstructionPath]);

  // Role-based redirection
  useEffect(() => {
    if (isChecking || !permissionsLoaded || !userInfo) return;

    // Helper to find first allowed path
    const getFirstAllowedPath = () => {
      if (isEmployee) {
        if (availableTabs.length > 0) {
          return availableTabs[0].path;
        }
        return `${basePath}/inundation?activeTab=4`;
      }

      // Admin/Company logic
      const findInItems = (items) => {
        if (!items) return null;
        for (const item of items) {
          if (item.type === 'item') {
            if (!item.id || hasPermission(item.id)) {
              return item.url;
            }
          }
          if (item.children) {
            const found = findInItems(item.children);
            if (found) return found;
          }
        }
        return null;
      };

      // Search across all menu item groups
      for (const group of menuItems.items) {
        const found = findInItems(group.children);
        if (found) return found;
      }

      return null;
    };

    // If at root, redirect to first allowed page
    if (pathname === '/') {
      const targetPath = getFirstAllowedPath();
      if (targetPath) {
        navigate(targetPath, { replace: true });
      } else {
        // Fallback if no permissions at all - maybe redirect to profile or logout
        navigate(`${basePath}/inundation?activeTab=4`, { replace: true });
      }
      return;
    }

    // Verify permission for current admin/company route
    if (!isEmployee && pathname !== '/') {
      const findCurrentItem = (items) => {
        if (!items) return null;
        for (const item of items) {
          if (item.url === pathname) return item;
          if (item.children) {
            const found = findCurrentItem(item.children);
            if (found) return found;
          }
        }
        return null;
      };

      let currentMenuItem = null;
      for (const group of menuItems.items) {
        currentMenuItem = findCurrentItem(group.children);
        if (currentMenuItem) break;
      }

      if (currentMenuItem && currentMenuItem.id && !hasPermission(currentMenuItem.id)) {
        const targetPath = getFirstAllowedPath();
        if (targetPath && targetPath !== pathname) {
          navigate(targetPath, { replace: true });
        } else {
          // No alternative found or looping - redirect to profile tab of inundation as fallback
          navigate(`${basePath}/inundation?activeTab=4`, { replace: true });
        }
        return;
      }
    }

    // Redirect if on the wrong path prefix
    if (isEmployee && pathname.startsWith('/admin')) {
      const newPath = pathname.replace('/admin', '/company');
      navigate(newPath, { replace: true });
    } else if (!isEmployee && pathname.startsWith('/company')) {
      const newPath = pathname.replace('/company', '/admin');
      navigate(newPath, { replace: true });
    }
  }, [isChecking, permissionsLoaded, userInfo, pathname, navigate, isEmployee, availableTabs, basePath, hasPermission]);

  const showMobileAppLayout = isEmployee && (isInundationPath || isConstructionPath || isPumpingPath);

  // Global Bottom Navigation items for Employee
  const employeeNavItems = useMemo(() => {
    if (!isEmployee || !userInfo) return [];
    
    return [
      {
        id: 'inundation',
        label: 'Trực ngập',
        icon: (
          <Badge badgeContent={activeFloodCount} color="error" max={99}>
            <WarningIcon sx={{ fontSize: '1.6rem' }} />
          </Badge>
        ),
        path: `${basePath}/inundation`,
        active: isInundationPath && !pathname.includes('activeTab=3')
      },
      {
        id: 'pumping',
        label: 'Trạm bơm',
        icon: <EngineeringIcon sx={{ fontSize: '1.6rem' }} />,
        path: `${basePath}/tram-bom`,
        active: isPumpingPath,
        show: !isEmployee || (userInfo?.assigned_pumping_station_id && userInfo.assigned_pumping_station_id.trim() !== "")
      },
      {
        id: 'construction',
        label: 'Công trình',
        icon: <DashboardIcon sx={{ fontSize: '1.6rem' }} />,
        path: `${basePath}/emergency-construction/dashboard`,
        active: isConstructionPath,
        show: !isEmployee || (userInfo?.assigned_emergency_construction_ids?.filter(id => id && id.trim() !== "").length > 0)
      },
      {
        id: 'profile',
        label: 'Cá nhân',
        icon: <PersonIcon sx={{ fontSize: '1.6rem' }} />,
        path: `${basePath}/inundation?activeTab=3`,
        active: pathname.includes('activeTab=3')
      }
    ].filter(item => item.show !== false);
  }, [isEmployee, userInfo, activeFloodCount, isInundationPath, isPumpingPath, isConstructionPath, pathname, basePath]);

  // Auto-collapse sidebar on AI Support page (only for mobile)
  useEffect(() => {
    if (isAiSupportPath && downSM) {
      handlerDrawerOpen(false);
    }
  }, [isAiSupportPath, downSM]);

  // Fetch active flood count for badge
  useEffect(() => {
    if (!isEmployee) return;
    const fetchCount = async () => {
      try {
        const res = await inundationApi.listReports();
        const active = (res.data || res || []).filter(r => r.status !== 'resolved').length;
        setActiveFloodCount(active);
      } catch { /* silent */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [isEmployee]);

  // Always open sidebar on desktop/tablet
  useEffect(() => {
    if (!downSM && !drawerOpen) {
      handlerDrawerOpen(true);
    }
  }, [drawerOpen, downSM]);

  if (menuMasterLoading || isChecking || !permissionsLoaded) return <Loader />;

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
        <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', pb: 10 }}>
          <Box sx={{ flexGrow: 1, p: 0 }}>
             <Outlet context={{ userInfo }} />
          </Box>

          {/* New Global Mobile Bottom Navigation */}
          <Paper
            sx={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
              borderRadius: '24px 24px 0 0', overflow: 'hidden',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderTop: '1px solid',
              borderColor: 'divider'
            }}
            elevation={0}
          >
            <BottomNavigation
              showLabels
              value={employeeNavItems.findIndex(item => item.active)}
              onChange={(_, newValue) => {
                const target = employeeNavItems[newValue];
                if (target) navigate(target.path);
              }}
              sx={{
                height: 80,
                bgcolor: 'transparent',
                '& .MuiBottomNavigationAction-root': { 
                  minWidth: 'auto',
                  color: 'text.secondary',
                  '&.Mui-selected': { color: 'primary.main' }
                },
                '& .MuiBottomNavigationAction-label': { 
                  fontWeight: 800, 
                  fontSize: '0.75rem', 
                  mt: 0.5,
                  '&.Mui-selected': { fontSize: '0.8rem' }
                }
              }}
            >
              {employeeNavItems.map((item) => (
                <BottomNavigationAction 
                  key={item.id} 
                  label={item.label} 
                  icon={item.icon} 
                />
              ))}
            </BottomNavigation>
          </Paper>
        </Box>
      ) : (
        <MainContentStyled {...{ borderRadius, open: drawerOpen }}>
          <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: 'calc(100vh - 128px)', display: 'flex', flexDirection: 'column' }}>
            <Breadcrumbs />
            <Outlet context={{ userInfo }} />
            <Footer />
          </Box>
        </MainContentStyled>
      )}
      {!showMobileAppLayout && isCompany && <FloatingChat />}
    </Box>
  );
}