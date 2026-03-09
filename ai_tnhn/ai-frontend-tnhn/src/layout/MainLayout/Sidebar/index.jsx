import { memo, useMemo } from 'react';

import useMediaQuery from '@mui/material/useMediaQuery';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

// project imports
import MenuCard from './MenuCard';
import MenuList from '../MenuList';
import LogoSection from '../LogoSection';
import MiniDrawerStyled from './MiniDrawerStyled';

import useConfig from 'hooks/useConfig';
import { drawerWidth } from 'store/constant';
import SimpleBar from 'ui-component/third-party/SimpleBar';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

// ==============================|| SIDEBAR DRAWER ||============================== //

function Sidebar() {
  const downSM = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const {
    state: { miniDrawer }
  } = useConfig();

  const logo = useMemo(
    () => (
      <Box sx={{ display: 'flex', p: 2 }}>
        <LogoSection />
      </Box>
    ),
    []
  );

  const drawer = useMemo(() => {
    const drawerContent = (
      <>
        <MenuCard />
        <Stack direction="row" sx={{ justifyContent: 'center', mb: 2 }}>
          <Chip label={import.meta.env.VITE_APP_VERSION} size="small" color="default" />
        </Stack>
      </>
    );

    let drawerSX = { paddingLeft: '0px', paddingRight: '0px', marginTop: '20px' };
    if (drawerOpen) drawerSX = { paddingLeft: '16px', paddingRight: '16px', marginTop: '0px' };

    return (
      <>
        {downSM ? (
          <Box sx={drawerSX}>
            <MenuList />
            {drawerOpen && drawerContent}
          </Box>
        ) : (
          <SimpleBar sx={{ height: 'calc(100vh - 90px)', ...drawerSX }}>
            <MenuList />
            {drawerOpen && drawerContent}
          </SimpleBar>
        )}
      </>
    );
  }, [downSM, drawerOpen]);

  return (
    <Box component="nav" sx={{ flexShrink: { sm: 0 }, width: { xs: 'auto', sm: drawerWidth } }} aria-label="mailbox folders">
      {downSM || (miniDrawer && drawerOpen) ? (
        <Drawer
          variant={downSM ? 'temporary' : 'persistent'}
          anchor="left"
          open={drawerOpen}
          onClose={() => handlerDrawerOpen(!drawerOpen)}
          slotProps={{
            paper: {
              sx: {
                mt: downSM ? 0 : 11,
                zIndex: 1099,
                width: drawerWidth,
                bgcolor: 'background.default',
                color: 'text.primary',
                borderRight: 'none'
              }
            }
          }}
          ModalProps={{ keepMounted: true }}
          color="inherit"
        >
          {downSM && logo}
          {drawer}
        </Drawer>
      ) : (
        <MiniDrawerStyled variant="permanent" open={drawerOpen}>
          {logo}
          {drawer}
        </MiniDrawerStyled>
      )}
    </Box>
  );
}

export default memo(Sidebar);
