import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Badge from '@mui/material/Badge';
import WarningIcon from '@mui/icons-material/Warning';
import PersonIcon from '@mui/icons-material/Person';
import EngineeringIcon from '@mui/icons-material/Engineering';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import OpacityIcon from '@mui/icons-material/Opacity';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

import useConfig from 'hooks/useConfig';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import authApi from 'api/auth';
import { ADMIN_TOKEN } from 'constants/auth';
import inundationApi from 'api/inundation';
import useAuthStore from 'store/useAuthStore';
import useInundationStore from 'store/useInundationStore';
import menuItems from 'menu-items';

const useMainLayout = () => {
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
  const { connectSSE, disconnectSSE } = useInundationStore();

  // Global SSE connection
  useEffect(() => {
    if (userInfo && !isChecking && permissionsLoaded) {
      connectSSE();
    }
    return () => {
      disconnectSSE();
    };
  }, [userInfo, isChecking, permissionsLoaded, connectSSE, disconnectSSE]);

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

      // Optimization: If user and token already exist in store, stop loading immediately
      // and perform a "silent" background check/update to prevent UI flicker
      if (storeState.user && storeState.token === currentToken) {
        setIsChecking(false);
        authApi.getProfile().then((user) => {
          if (user && user.id) {
            storeLogin(user, currentToken, user.role, user.is_employee, user.is_company, user.role_level);
          }
        }).catch((err) => {
          console.error('Background profile refresh failed:', err);
          if (err.response?.status === 401) {
            storeLogout();
            navigate('/pages/login', { replace: true });
          }
        });
        return;
      }

      try {
        if (urlToken) {
          localStorage.setItem(ADMIN_TOKEN, urlToken);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const user = await authApi.getProfile();
        if (user && user.id) {
          storeLogin(user, currentToken, user.role, user.is_employee, user.is_company, user.role_level);
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
  const isInundationPath = pathname === '/' || pathname.includes('/inundation');
  const isPumpingPath = pathname.includes('/tram-bom');
  const isWastewaterPath = pathname.includes('/wastewater-treatment');
  const isAiSupportPath = pathname === '/admin/ai-support';
  const isSluiceGatePath = pathname.includes('/cua-phai');
  const isWaterPath = pathname.includes('/song-ho');

  const availableTabs = useMemo(() => {
    if (!userInfo) return [];

    const tabs = [
      {
        id: 'inundation',
        label: 'Điểm ngập',
        path: `${basePath}/inundation`,
        active: isInundationPath,
        show: !isEmployee || hasPermission('inundation:survey') || hasPermission('inundation:mechanic') || hasPermission('inundation:review')
      },
      {
        id: 'pumping',
        label: 'Trạm bơm',
        path: `${basePath}/tram-bom`,
        active: isPumpingPath,
        show: !isEmployee || hasPermission('trambom:view')
      },
      {
        id: 'construction',
        label: 'Công trình khẩn',
        path: `${basePath}/emergency-construction/dashboard`,
        active: isConstructionPath,
        show: !isEmployee || hasPermission('emergency:view')
      }
    ];

    return tabs.filter(tab => tab.show);
  }, [userInfo, isEmployee, basePath, isInundationPath, isPumpingPath, isConstructionPath]);

  // Role-based redirection
  useEffect(() => {
    if (isChecking || !permissionsLoaded || !userInfo) return;

    const getFirstAllowedPath = () => {
      if (isEmployee) {
        if (availableTabs.length > 0) {
          return availableTabs[0].path;
        }
        return `${basePath}/inundation?activeTab=4`;
      }

      const findInItems = (items) => {
        if (!items) return null;
        for (const item of items) {
          if (item.type === 'item') {
            if (hasPermission(item.permission || item.id)) {
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

      for (const group of menuItems.items) {
        const found = findInItems(group.children);
        if (found) return found;
      }

      return null;
    };

    if (pathname === '/') {
      const targetPath = getFirstAllowedPath();
      if (targetPath) {
        navigate(targetPath, { replace: true });
      } else {
        navigate(`${basePath}/inundation?activeTab=4`, { replace: true });
      }
      return;
    }

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

      if (currentMenuItem && (currentMenuItem.permission || currentMenuItem.id) && !hasPermission(currentMenuItem.permission || currentMenuItem.id)) {
        const targetPath = getFirstAllowedPath();
        if (targetPath && targetPath !== pathname) {
          navigate(targetPath, { replace: true });
        } else {
          navigate(`${basePath}/inundation?activeTab=4`, { replace: true });
        }
        return;
      }
    }

    if (isEmployee && pathname.startsWith('/admin')) {
      const newPath = pathname.replace('/admin', '/company');
      navigate(newPath, { replace: true });
    } else if (!isEmployee && pathname.startsWith('/company')) {
      const newPath = pathname.replace('/company', '/admin');
      navigate(newPath, { replace: true });
    }
  }, [isChecking, permissionsLoaded, userInfo, pathname, navigate, isEmployee, availableTabs, basePath, hasPermission]);

  const showMobileAppLayout = isEmployee && (isInundationPath || isConstructionPath || isPumpingPath || isWastewaterPath || isSluiceGatePath || isWaterPath);

  // Global Bottom Navigation items for Employee
  const { employeeNavItems, otherItems } = useMemo(() => {
    if (!isEmployee || !userInfo) return { employeeNavItems: [], otherItems: [] };

    const candidates = [
      {
        id: 'inundation',
        label: 'Trực ngập',
        icon: (
          <Badge badgeContent={activeFloodCount} color="error" max={99}>
            <WarningIcon sx={{ fontSize: '1.6rem' }} />
          </Badge>
        ),
        path: `${basePath}/inundation`,
        active: isInundationPath && !pathname.includes('activeTab=3'),
        show: userInfo?.assigned_inundation_station_ids?.length > 0
      },
      {
        id: 'pumping',
        label: 'Trạm bơm',
        icon: <EngineeringIcon sx={{ fontSize: '1.6rem' }} />,
        path: `${basePath}/tram-bom`,
        active: isPumpingPath,
        show: userInfo?.assigned_pumping_station_id && userInfo.assigned_pumping_station_id.trim() !== ""
      },
      {
        id: 'wastewater',
        label: 'Trạm XLNT',
        icon: <OpacityIcon sx={{ fontSize: '1.6rem' }} />,
        path: `${basePath}/wastewater-treatment`,
        active: isWastewaterPath,
        show: userInfo?.assigned_wastewater_station_id && userInfo.assigned_wastewater_station_id.trim() !== ""
      },
      {
        id: 'sluice_gate',
        label: 'Cửa phai',
        icon: <MeetingRoomIcon sx={{ fontSize: '1.6rem' }} />,
        path: `${basePath}/cua-phai`,
        active: isSluiceGatePath,
        show: userInfo?.assigned_sluice_gate_id && userInfo.assigned_sluice_gate_id.trim() !== ""
      },
      {
        id: 'water',
        label: 'Sông Hồ',
        icon: <WaterDropIcon sx={{ fontSize: '1.6rem' }} />,
        path: `${basePath}/song-ho`,
        active: isWaterPath,
        show: userInfo?.assigned_lake_station_ids?.length > 0 || userInfo?.assigned_river_station_ids?.length > 0
      }
    ];

    const assigned = candidates.filter(c => c.show);

    let navItems = [];
    let extra = [];

    if (assigned.length <= 3) {
      navItems = [...assigned];
    } else {
      navItems = assigned.slice(0, 2);
      extra = assigned.slice(2);
      navItems.push({
        id: 'other',
        label: 'Mục khác',
        icon: <MoreHorizIcon sx={{ fontSize: '1.6rem' }} />,
        active: extra.some(item => item.active)
      });
    }

    navItems.push({
      id: 'profile',
      label: 'Tôi',
      icon: <PersonIcon sx={{ fontSize: '1.6rem' }} />,
      path: `${basePath}/inundation?activeTab=3`,
      active: pathname.includes('activeTab=3')
    });

    return { employeeNavItems: navItems, otherItems: extra };
  }, [isEmployee, userInfo, activeFloodCount, isInundationPath, isPumpingPath, isWastewaterPath, isSluiceGatePath, isWaterPath, pathname, basePath]);

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
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [isEmployee]);

  // Always open sidebar on desktop/tablet
  useEffect(() => {
    if (!downSM && !drawerOpen) {
      handlerDrawerOpen(true);
    }
  }, [drawerOpen, downSM]);

  return {
    menuMasterLoading,
    isChecking,
    permissionsLoaded,
    showMobileAppLayout,
    userInfo,
    userRole,
    employeeNavItems,
    otherItems,
    borderRadius,
    drawerOpen,
    isCompany
  };
};

export default useMainLayout;
