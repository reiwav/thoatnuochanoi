import React from 'react';
import { Outlet } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';

import Footer from './Footer';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileBottomNavigation from './MobileBottomNavigation';
import MainContentStyled from './MainContentStyled';
import FloatingChat from './FloatingChat';
import Loader from 'ui-component/Loader';
import Breadcrumbs from 'ui-component/extended/Breadcrumbs';
import useMainLayout from './useMainLayout.jsx';

export default function MainLayout() {
  const {
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
  } = useMainLayout();

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
          <MobileBottomNavigation employeeNavItems={employeeNavItems} otherItems={otherItems} />
        </Box>
      ) : (
        <MainContentStyled {...{ borderRadius, open: drawerOpen }}>
          <Box sx={{ width: '100%', p: { xs: 2, sm: 3 }, minHeight: 'calc(100vh - 128px)', display: 'flex', flexDirection: 'column' }}>
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