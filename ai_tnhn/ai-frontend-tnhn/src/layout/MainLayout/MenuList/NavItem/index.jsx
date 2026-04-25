import PropTypes from 'prop-types';
import { Activity, useEffect, useRef, useState } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import useConfig from 'hooks/useConfig';
import useAuthStore from 'store/useAuthStore';

// assets
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// ==============================|| NAV ITEM ||============================== //

export default function NavItem({ item, level, isParents = false, setSelectedID }) {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  const ref = useRef(null);

  const { pathname } = useLocation();
  const {
    state: { borderRadius }
  } = useConfig();

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;
  const isSelected = !!matchPath({ path: item?.link ? item.link : item.url, end: true }, pathname);

  const { hasPermission, role } = useAuthStore();
  
  if (item.permission && !hasPermission(item.permission)) return null;
  if (item.exactRole && role !== item.exactRole) return null;

  const [hoverStatus, setHover] = useState(false);

  const compareSize = () => {
    const compare = ref.current && ref.current.scrollWidth > ref.current.clientWidth;
    setHover(compare);
  };

  useEffect(() => {
    compareSize();
    window.addEventListener('resize', compareSize);
    window.removeEventListener('resize', compareSize);
  }, []);

  const Icon = item?.icon;
  const menuIconSize = downMD ? '20px' : (drawerOpen ? '20px' : '24px');
  const itemIcon = item?.icon ? (
    <Icon stroke={1.5} size={menuIconSize} style={{ ...(isParents && { fontSize: 20, stroke: '1.5' }) }} />
  ) : (
    <FiberManualRecordIcon sx={{ width: isSelected ? 8 : 6, height: isSelected ? 8 : 6 }} fontSize={level > 0 ? 'inherit' : 'medium'} />
  );

  let itemTarget = '_self';
  if (item.target) {
    itemTarget = '_blank';
  }

  const itemHandler = (event) => {
    if (downMD) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      handlerDrawerOpen(false);
    }

    if (isParents && setSelectedID) {
      setSelectedID();
    }
  };

  return (
    <>
      <ListItemButton
        component={Link}
        to={item.url}
        target={itemTarget}
        disabled={item.disabled}
        disableRipple={!drawerOpen}
        sx={{
          zIndex: 1201,
          borderRadius: `${borderRadius}px`,
          mb: 0.5,
          ...(drawerOpen && level !== 1 && { ml: `${level * 18}px` }),
          ...(!drawerOpen && { pl: 1.25 }),
          ...((!drawerOpen || level !== 1) && {
            py: level === 1 ? 0 : 1,
            '&:hover': { bgcolor: 'transparent' },
            '&.Mui-selected': {
              '&:hover': { bgcolor: 'transparent' },
              bgcolor: 'transparent'
            }
          })
        }}
        selected={isSelected}
        onClick={(e) => itemHandler(e)}
      >
        <ButtonBase aria-label="theme-icon" sx={{ borderRadius: `${borderRadius}px` }} disableRipple={drawerOpen}>
          <ListItemIcon
            sx={{
              minWidth: level === 1 ? (downMD ? 56 : 36) : 18,
              color: isSelected ? 'secondary.main' : 'text.primary',
              ...(!drawerOpen &&
                level === 1 && {
                borderRadius: `${borderRadius}px`,
                width: 46,
                height: 46,
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover': { bgcolor: 'secondary.light' },
                ...(isSelected && {
                  bgcolor: 'secondary.light',
                  '&:hover': { bgcolor: 'secondary.light' }
                })
              })
            }}
          >
            {itemIcon}
          </ListItemIcon>
        </ButtonBase>

        {(drawerOpen || (!drawerOpen && level !== 1)) && (
          <Tooltip title={item.title} disableHoverListener={!hoverStatus}>
            <ListItemText
              primary={
                <Typography
                  ref={ref}
                  noWrap
                  variant={downMD ? (level === 1 ? 'h5' : 'body1') : (isSelected ? 'h5' : 'body1')}
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: downMD ? 200 : 102,
                    color: 'inherit'
                  }}
                >
                  {item.title}
                </Typography>
              }
              secondary={
                item.caption && (
                  <Typography
                    variant="caption"
                    gutterBottom
                    sx={{
                      display: 'block',
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      color: 'text.secondary',
                      textTransform: 'capitalize',
                      lineHeight: 1.66
                    }}
                  >
                    {item.caption}
                  </Typography>
                )
              }
            />
          </Tooltip>
        )}

        <Activity mode={drawerOpen && item.chip ? 'visible' : 'hidden'}>
          <Chip
            color={item.chip?.color}
            variant={item.chip?.variant}
            size={item.chip?.size}
            label={item.chip?.label}
            avatar={
              <Activity mode={item.chip?.avatar ? 'visible' : 'hidden'}>
                <Avatar>{item.chip?.avatar}</Avatar>
              </Activity>
            }
          />
        </Activity>
      </ListItemButton>
    </>
  );
}

NavItem.propTypes = { item: PropTypes.any, level: PropTypes.number, isParents: PropTypes.bool, setSelectedID: PropTypes.func };
